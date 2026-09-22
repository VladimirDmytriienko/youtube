import os
import sqlite3
import json
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'scheduler.db').replace('\\', '/')
logger = logging.getLogger("Database")

def get_connection():
    conn = sqlite3.connect(DB_PATH, timeout=15.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA busy_timeout=5000;")
    return conn

def init_db():
    """Initializes the SQLite database and migrates existing JSON history if any."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS video_records (
                path TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                title TEXT,
                description TEXT,
                tags TEXT,
                is_shorts INTEGER DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'planning', -- 'planning', 'scheduled', 'posted'
                scheduled_for TEXT,
                youtube_id TEXT,
                youtube_url TEXT,
                uploaded_at TEXT,
                updated_at TEXT NOT NULL,
                default_lang TEXT DEFAULT 'en',
                localizations TEXT,
                custom_thumb_path TEXT
            )
        ''')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_status ON video_records(status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_scheduled ON video_records(scheduled_for)')
        
        # Migrations for existing tables
        cursor.execute("PRAGMA table_info(video_records)")
        existing_cols = {row['name'] for row in cursor.fetchall()}
        if 'default_lang' not in existing_cols:
            cursor.execute("ALTER TABLE video_records ADD COLUMN default_lang TEXT DEFAULT 'en'")
        if 'localizations' not in existing_cols:
            cursor.execute("ALTER TABLE video_records ADD COLUMN localizations TEXT")
        if 'custom_thumb_path' not in existing_cols:
            cursor.execute("ALTER TABLE video_records ADD COLUMN custom_thumb_path TEXT")
            
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ai_token_usage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                feature TEXT NOT NULL,
                model TEXT NOT NULL,
                prompt_tokens INTEGER DEFAULT 0,
                candidates_tokens INTEGER DEFAULT 0,
                total_tokens INTEGER DEFAULT 0,
                created_at TEXT NOT NULL
            )
        ''')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_ai_usage_time ON ai_token_usage(created_at)')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        ''')

        conn.commit()
    
    migrate_from_json()

def get_setting(key: str, default: Optional[str] = None) -> Optional[str]:
    """Retrieves a configuration value from SQLite app_settings."""
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM app_settings WHERE key = ?", (key,))
            row = cursor.fetchone()
            if row:
                return row["value"]
    except Exception as e:
        logger.warning(f"Error reading setting '{key}': {e}")
    return default

def set_setting(key: str, value: str):
    """Sets or updates a configuration value in SQLite app_settings."""
    now_str = datetime.utcnow().isoformat() + "Z"
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO app_settings (key, value, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET
                    value = excluded.value,
                    updated_at = excluded.updated_at
            ''', (key, str(value), now_str))
            conn.commit()
    except Exception as e:
        logger.error(f"Error saving setting '{key}': {e}")

def get_all_settings() -> Dict[str, str]:
    """Returns all settings as a dictionary."""
    results = {}
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT key, value FROM app_settings")
            for r in cursor.fetchall():
                results[r["key"]] = r["value"]
    except Exception as e:
        logger.warning(f"Error reading all settings: {e}")
    return results

def log_ai_usage(feature: str, model: str, prompt_tokens: int, candidates_tokens: int, total_tokens: int):
    """Logs token usage for an AI call."""
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO ai_token_usage (feature, model, prompt_tokens, candidates_tokens, total_tokens, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (feature, model, prompt_tokens, candidates_tokens, total_tokens, datetime.now().isoformat()))
            conn.commit()
    except Exception as e:
        logger.error(f"Failed to log AI usage: {e}")

def get_ai_usage_summary() -> Dict[str, Any]:
    """Returns aggregated token usage statistics, daily quota progress, and recent calls."""
    DAILY_LIMIT = 1_000_000  # 1M tokens/day for Google Gemini Flash Free Tier
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT 
                    COUNT(*) as total_requests,
                    COALESCE(SUM(total_tokens), 0) as total_tokens,
                    COALESCE(SUM(prompt_tokens), 0) as prompt_tokens,
                    COALESCE(SUM(candidates_tokens), 0) as candidates_tokens
                FROM ai_token_usage
            ''')
            row = cursor.fetchone()

            # Last 24 hours tokens
            since_24h = (datetime.now() - timedelta(hours=24)).isoformat()
            cursor.execute('''
                SELECT 
                    COUNT(*) as today_requests,
                    COALESCE(SUM(total_tokens), 0) as today_tokens
                FROM ai_token_usage
                WHERE created_at >= ?
            ''', (since_24h,))
            today_row = cursor.fetchone()
            today_tokens = today_row["today_tokens"] if today_row else 0
            today_requests = today_row["today_requests"] if today_row else 0

            remaining_tokens = max(0, DAILY_LIMIT - today_tokens)
            remaining_percent = round((remaining_tokens / DAILY_LIMIT) * 100, 1)
            used_percent = round((today_tokens / DAILY_LIMIT) * 100, 1)
            
            cursor.execute('''
                SELECT feature, model, prompt_tokens, candidates_tokens, total_tokens, created_at
                FROM ai_token_usage
                ORDER BY id DESC LIMIT 5
            ''')
            recent = [dict(r) for r in cursor.fetchall()]
            
            return {
                "daily_limit": DAILY_LIMIT,
                "today_tokens": today_tokens,
                "today_requests": today_requests,
                "remaining_tokens": remaining_tokens,
                "remaining_percent": remaining_percent,
                "used_percent": used_percent,
                "total_requests": row["total_requests"] if row else 0,
                "total_tokens": row["total_tokens"] if row else 0,
                "prompt_tokens": row["prompt_tokens"] if row else 0,
                "candidates_tokens": row["candidates_tokens"] if row else 0,
                "recent": recent
            }
    except Exception as e:
        logger.error(f"Failed to get AI usage summary: {e}")
        return {
            "total_requests": 0,
            "total_tokens": 0,
            "prompt_tokens": 0,
            "candidates_tokens": 0,
            "recent": []
        }

def migrate_from_json():
    """Imports historical uploads from uploads_history.json into SQLite if not already present."""
    history_file = 'e:/youtube/web_app/uploads_history.json'
    if not os.path.exists(history_file):
        return
        
    try:
        with open(history_file, 'r', encoding='utf-8') as f:
            items = json.load(f)
            
        with get_connection() as conn:
            cursor = conn.cursor()
            for it in items:
                v_path = it.get('file_path') or it.get('file')
                if not v_path:
                    continue
                v_path = v_path.replace('\\', '/')
                
                # Check if already exists
                cursor.execute('SELECT path FROM video_records WHERE path = ?', (v_path,))
                if cursor.fetchone():
                    continue
                    
                status = 'posted' if it.get('privacy') == 'public' else 'scheduled'
                now_str = datetime.utcnow().isoformat() + "Z"
                
                cursor.execute('''
                    INSERT INTO video_records (
                        path, filename, title, description, tags,
                        is_shorts, status, scheduled_for, youtube_id,
                        youtube_url, uploaded_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    v_path,
                    it.get('file', os.path.basename(v_path)),
                    it.get('title', ''),
                    it.get('description', ''),
                    json.dumps(it.get('tags', [])),
                    1 if it.get('is_shorts') else 0,
                    status,
                    it.get('scheduled_for'),
                    it.get('id'),
                    it.get('url'),
                    it.get('uploaded_at', now_str),
                    now_str
                ))
            conn.commit()
    except Exception as e:
        logger.warning(f"JSON migration warning: {e}")

def _format_record(d: Dict[str, Any]) -> Dict[str, Any]:
    d['is_shorts'] = bool(d.get('is_shorts'))
    try:
        d['tags'] = json.loads(d['tags']) if d.get('tags') else []
    except Exception:
        d['tags'] = []
    try:
        d['localizations'] = json.loads(d['localizations']) if d.get('localizations') else {}
    except Exception:
        d['localizations'] = {}
    return d

def get_record(path: str) -> Optional[Dict[str, Any]]:
    path = path.replace('\\', '/')
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM video_records WHERE path = ?', (path,))
        row = cursor.fetchone()
        if row:
            return _format_record(dict(row))
    return None

def sync_scheduled_statuses() -> int:
    """
    Auto-reconciliation: checks all records where status == 'scheduled'.
    If scheduled_for <= current UTC time, automatically updates status to 'posted'.
    Returns count of transitioned records.
    """
    now_utc = datetime.utcnow()
    now_iso = now_utc.isoformat() + "Z"

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT path, scheduled_for FROM video_records WHERE status = 'scheduled' AND scheduled_for IS NOT NULL")
        rows = cursor.fetchall()
        
        to_update = []
        for r in rows:
            sched_str = r['scheduled_for']
            if not sched_str:
                continue
            try:
                clean_str = sched_str.replace('Z', '+00:00')
                if '+' not in clean_str and '-' not in clean_str[10:]:
                    # naive ISO string
                    dt = datetime.fromisoformat(clean_str)
                    if dt <= now_utc:
                        to_update.append(r['path'])
                else:
                    from datetime import timezone
                    dt = datetime.fromisoformat(clean_str)
                    if dt <= datetime.now(timezone.utc):
                        to_update.append(r['path'])
            except Exception:
                if sched_str <= now_iso:
                    to_update.append(r['path'])

        if to_update:
            cursor.executemany(
                "UPDATE video_records SET status = 'posted', updated_at = ? WHERE path = ?",
                [(now_iso, p) for p in to_update]
            )
            conn.commit()
            logger.info(f"Auto-synced {len(to_update)} scheduled videos to 'posted' status.")
            return len(to_update)

    return 0

def get_all_records() -> Dict[str, Dict[str, Any]]:
    sync_scheduled_statuses()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM video_records')
        rows = cursor.fetchall()
        result = {}
        for r in rows:
            d = _format_record(dict(r))
            result[d['path']] = d
        return result

def upsert_record(
    path: str,
    filename: str,
    title: Optional[str] = None,
    description: Optional[str] = None,
    tags: Optional[List[str]] = None,
    is_shorts: bool = False,
    status: str = 'planning',
    scheduled_for: Optional[str] = None,
    youtube_id: Optional[str] = None,
    youtube_url: Optional[str] = None,
    uploaded_at: Optional[str] = None,
    default_lang: Optional[str] = 'en',
    localizations: Optional[Dict[str, Any]] = None,
    custom_thumb_path: Optional[str] = None
) -> Dict[str, Any]:
    path = path.replace('\\', '/')
    now_str = datetime.utcnow().isoformat() + "Z"
    tags_str = json.dumps(tags or [])
    localizations_str = json.dumps(localizations) if localizations else None
    
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO video_records (
                path, filename, title, description, tags,
                is_shorts, status, scheduled_for, youtube_id,
                youtube_url, uploaded_at, updated_at,
                default_lang, localizations, custom_thumb_path
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(path) DO UPDATE SET
                filename = excluded.filename,
                title = COALESCE(excluded.title, video_records.title),
                description = COALESCE(excluded.description, video_records.description),
                tags = COALESCE(excluded.tags, video_records.tags),
                is_shorts = excluded.is_shorts,
                status = excluded.status,
                scheduled_for = excluded.scheduled_for,
                youtube_id = COALESCE(excluded.youtube_id, video_records.youtube_id),
                youtube_url = COALESCE(excluded.youtube_url, video_records.youtube_url),
                uploaded_at = COALESCE(excluded.uploaded_at, video_records.uploaded_at),
                updated_at = excluded.updated_at,
                default_lang = COALESCE(excluded.default_lang, video_records.default_lang),
                localizations = COALESCE(excluded.localizations, video_records.localizations),
                custom_thumb_path = COALESCE(excluded.custom_thumb_path, video_records.custom_thumb_path)
        ''', (
            path, filename, title, description, tags_str,
            1 if is_shorts else 0, status, scheduled_for, youtube_id,
            youtube_url, uploaded_at, now_str,
            default_lang, localizations_str, custom_thumb_path
        ))
        conn.commit()
    
    return get_record(path)

def update_status(
    path: str,
    status: str,
    scheduled_for: Optional[str] = None,
    youtube_url: Optional[str] = None,
    title: Optional[str] = None,
    default_lang: Optional[str] = None,
    localizations: Optional[Dict[str, Any]] = None,
    custom_thumb_path: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    path = path.replace('\\', '/')
    now_str = datetime.utcnow().isoformat() + "Z"
    
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT path FROM video_records WHERE path = ?', (path,))
        if not cursor.fetchone():
            filename = os.path.basename(path)
            loc_str = json.dumps(localizations) if localizations else None
            cursor.execute('''
                INSERT INTO video_records (
                    path, filename, title, is_shorts, status, scheduled_for, youtube_url, updated_at,
                    default_lang, localizations, custom_thumb_path
                ) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)
            ''', (path, filename, title or filename, status, scheduled_for, youtube_url, now_str, default_lang or 'en', loc_str, custom_thumb_path))
        else:
            updates = ['status = ?', 'updated_at = ?']
            params = [status, now_str]
            
            if scheduled_for is not None:
                updates.append('scheduled_for = ?')
                params.append(scheduled_for)
            elif status == 'planning':
                updates.append('scheduled_for = NULL')
                
            if youtube_url is not None:
                updates.append('youtube_url = ?')
                params.append(youtube_url)
                
            if title is not None:
                updates.append('title = ?')
                params.append(title)
                
            if default_lang is not None:
                updates.append('default_lang = ?')
                params.append(default_lang)

            if localizations is not None:
                updates.append('localizations = ?')
                params.append(json.dumps(localizations))

            if custom_thumb_path is not None:
                updates.append('custom_thumb_path = ?')
                params.append(custom_thumb_path)
                
            params.append(path)
            sql = f"UPDATE video_records SET {', '.join(updates)} WHERE path = ?"
            cursor.execute(sql, params)
            
        conn.commit()
        
    return get_record(path)

def get_history_records() -> List[Dict[str, Any]]:
    """Returns records that are either scheduled or posted, ordered by scheduled_for or updated_at."""
    sync_scheduled_statuses()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM video_records 
            WHERE status IN ('scheduled', 'posted')
            ORDER BY COALESCE(scheduled_for, updated_at) DESC
        ''')
        rows = cursor.fetchall()
        results = []
        for r in rows:
            d = dict(r)
            d['is_shorts'] = bool(d['is_shorts'])
            try:
                d['tags'] = json.loads(d['tags']) if d['tags'] else []
            except Exception:
                d['tags'] = []
            results.append(d)
        return results

def get_calendar_map() -> Dict[str, List[Dict[str, Any]]]:
    """Groups scheduled and posted records by date YYYY-MM-DD."""
    sync_scheduled_statuses()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM video_records 
            WHERE status IN ('scheduled', 'posted') AND scheduled_for IS NOT NULL
            ORDER BY scheduled_for ASC
        ''')
        rows = cursor.fetchall()
        calendar = {}
        for r in rows:
            d = dict(r)
            d['is_shorts'] = bool(d['is_shorts'])
            try:
                d['tags'] = json.loads(d['tags']) if d['tags'] else []
            except Exception:
                d['tags'] = []
                
            d_str = d['scheduled_for'][:10]
            if d_str not in calendar:
                calendar[d_str] = []
            calendar[d_str].append(d)
        return calendar

def delete_record(path: str) -> bool:
    """Deletes a video record from the SQLite database."""
    path = path.replace('\\', '/')
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM video_records WHERE path = ?', (path,))
        conn.commit()
        return cursor.rowcount > 0

def move_record(old_path: str, new_path: str) -> Optional[Dict[str, Any]]:
    """Updates the path and filename of a video record when moved on disk."""
    old_path = old_path.replace('\\', '/')
    new_path = new_path.replace('\\', '/')
    now_str = datetime.utcnow().isoformat() + "Z"
    new_filename = os.path.basename(new_path)

    with get_connection() as conn:
        cursor = conn.cursor()
        # Remove any existing collision at new_path
        cursor.execute('DELETE FROM video_records WHERE path = ?', (new_path,))
        cursor.execute('''
            UPDATE video_records
            SET path = ?, filename = ?, updated_at = ?
            WHERE path = ?
        ''', (new_path, new_filename, now_str, old_path))
        conn.commit()

    return get_record(new_path)

