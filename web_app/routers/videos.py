import os
import re
import shutil
import subprocess
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel

import database
from core.config import ROOT_DIR, BASE_DIR, THUMB_CACHE, logger
from core.video_helpers import get_video_metadata, parse_description_file

router = APIRouter()

@router.get("/config")
def get_config():
    return {
        "base_dir": BASE_DIR,
        "exists": os.path.exists(BASE_DIR),
        "status": "ready"
    }

def _build_video_item(
    f: str,
    v_path: str,
    folder: str,
    is_archived: bool,
    meta: Optional[Dict[str, Any]] = None,
    db_records: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    size_mb = round(os.path.getsize(v_path) / (1024 * 1024), 1)
    v_info = get_video_metadata(v_path)

    title_opts = meta.get("title_options") if meta else None
    first_title = title_opts[0] if (title_opts and len(title_opts) > 0) else None

    db_entry = db_records.get(v_path) if db_records else None
    if not db_entry:
        default_title = first_title or f
        default_desc = meta.get("description", "") if meta else ""
        default_tags = meta.get("tags", []) if meta else []
        db_entry = database.upsert_record(
            path=v_path,
            filename=f,
            title=default_title,
            description=default_desc,
            tags=default_tags,
            is_shorts=v_info["is_shorts"],
            status="planning"
        )
        if db_records is not None:
            db_records[v_path] = db_entry

    title = db_entry.get("title") or first_title or f
    description = db_entry.get("description") or (meta.get("description", "") if meta else "")
    tags = db_entry.get("tags") or (meta.get("tags", []) if meta else [])

    return {
        "filename": f,
        "path": v_path,
        "folder": folder,
        "size_mb": size_mb,
        "duration": v_info["duration"],
        "duration_formatted": v_info["duration_formatted"],
        "width": v_info["width"],
        "height": v_info["height"],
        "is_shorts": v_info["is_shorts"],
        "aspect_ratio": v_info["aspect_ratio"],
        "title": title,
        "description": description,
        "tags": tags,
        "status": db_entry.get("status", "planning"),
        "scheduled_for": db_entry.get("scheduled_for"),
        "youtube_id": db_entry.get("youtube_id"),
        "youtube_url": db_entry.get("youtube_url"),
        "default_lang": db_entry.get("default_lang", "en"),
        "localizations": db_entry.get("localizations"),
        "custom_thumb_path": db_entry.get("custom_thumb_path"),
        "has_meta_file": bool(meta and (meta.get("title_options") or meta.get("description"))),
        "is_archived": is_archived
    }

@router.get("/videos")
def list_videos():
    """Scans BASE_DIR including archive subfolders, joins with SQLite database for statuses, titles, and schedules."""
    db_records = database.get_all_records()
    results = []

    if not os.path.exists(BASE_DIR):
        return results

    video_exts = ('.mp4', '.mov', '.mkv', '.avi', '.webm')

    for item in os.listdir(BASE_DIR):
        item_path = os.path.join(BASE_DIR, item)
        if os.path.isdir(item_path):
            if item.lower() in ('web_app', 'shorts', '.git', '.gemini', 'node_modules', 'cache', 'mockups', '.cache'):
                continue

            # Root archive directory
            if item.lower() == 'archive':
                for f in os.listdir(item_path):
                    if f.lower().endswith(video_exts):
                        v_path = os.path.join(item_path, f).replace('\\', '/')
                        results.append(_build_video_item(f, v_path, folder="root", is_archived=True, meta=None, db_records=db_records))
                continue

            meta = parse_description_file(item_path)
            for f in os.listdir(item_path):
                f_path = os.path.join(item_path, f)
                if os.path.isdir(f_path):
                    # Subfolder archive within project folder
                    if f.lower() == 'archive':
                        for af in os.listdir(f_path):
                            if af.lower().endswith(video_exts):
                                v_path = os.path.join(f_path, af).replace('\\', '/')
                                results.append(_build_video_item(af, v_path, folder=item, is_archived=True, meta=meta, db_records=db_records))
                elif f.lower().endswith(video_exts):
                    v_path = f_path.replace('\\', '/')
                    results.append(_build_video_item(f, v_path, folder=item, is_archived=False, meta=meta, db_records=db_records))

        elif item.lower().endswith(video_exts):
            v_path = os.path.join(BASE_DIR, item).replace('\\', '/')
            results.append(_build_video_item(item, v_path, folder="root", is_archived=False, meta=None, db_records=db_records))

    return results

@router.get("/thumbnail")
def get_thumbnail(path: str, t: Optional[float] = None):
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Файл не знайдено")
    
    if path.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
        media_type = "image/png" if path.lower().endswith('.png') else "image/jpeg"
        return FileResponse(path, media_type=media_type)

    if t is None:
        rec = database.get_record(path)
        if rec and rec.get("custom_thumb_path") and os.path.exists(rec["custom_thumb_path"]):
            return FileResponse(rec["custom_thumb_path"], media_type="image/jpeg")

    safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', os.path.basename(path))
    if t is not None and t >= 0:
        thumb_name = f"{safe_name}_t{int(round(t * 10))}.jpg"
        time_arg = str(round(t, 2))
    else:
        thumb_name = f"{safe_name}.jpg"
        time_arg = "2"

    thumb_path = os.path.join(THUMB_CACHE, thumb_name)
    if not os.path.exists(thumb_path):
        cmd = ['ffmpeg', '-y', '-ss', time_arg, '-i', path, '-vframes', '1', '-vf', 'scale=640:-1', thumb_path]
        subprocess.run(cmd, capture_output=True)
    if os.path.exists(thumb_path):
        return FileResponse(thumb_path, media_type="image/jpeg")
    raise HTTPException(status_code=500, detail="Не вдалося згенерувати прев'ю")

@router.get("/video/frame-candidates")
def get_frame_candidates(path: str):
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Файл не знайдено")
    meta = get_video_metadata(path)
    dur = max(1.0, meta.get("duration", 10.0))
    ratios = [0.10, 0.30, 0.55, 0.80]
    candidates = []
    safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', os.path.basename(path))
    
    for r in ratios:
        sec = round(dur * r, 1)
        thumb_name = f"{safe_name}_t{int(round(sec * 10))}.jpg"
        thumb_path = os.path.join(THUMB_CACHE, thumb_name)
        if not os.path.exists(thumb_path):
            cmd = ['ffmpeg', '-y', '-ss', str(sec), '-i', path, '-vframes', '1', '-vf', 'scale=640:-1', thumb_path]
            subprocess.run(cmd, capture_output=True)
        m = int(sec // 60)
        s = int(sec % 60)
        candidates.append({
            "timestamp": sec,
            "formatted": f"{m}:{s:02d}",
            "thumb_url": f"/api/thumbnail?path={path}&t={sec}",
            "thumb_path": thumb_path.replace('\\', '/')
        })
    return candidates

class ExtractFramesRequest(BaseModel):
    path: str
    count: Optional[int] = 4

@router.post("/video/extract-frames")
def extract_frames(req: ExtractFramesRequest):
    candidates = get_frame_candidates(req.path)
    return {"candidates": candidates}

@router.post("/video/custom-thumbnail")
@router.post("/thumbnail/upload")
async def save_custom_thumbnail(
    path: Optional[str] = Form(None),
    video_path: Optional[str] = Form(None),
    timestamp: Optional[float] = Form(None),
    file: Optional[UploadFile] = File(None)
):
    target_path = path or video_path
    if not target_path or not os.path.exists(target_path):
        raise HTTPException(status_code=404, detail="Файл не знайдено")
    safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', os.path.basename(target_path))
    
    if file:
        custom_name = f"custom_upload_{safe_name}.jpg"
        dest_path = os.path.join(THUMB_CACHE, custom_name)
        content = await file.read()
        with open(dest_path, "wb") as f:
            f.write(content)
    elif timestamp is not None:
        custom_name = f"custom_frame_{safe_name}_t{int(round(timestamp * 10))}.jpg"
        dest_path = os.path.join(THUMB_CACHE, custom_name)
        cmd = ['ffmpeg', '-y', '-ss', str(timestamp), '-i', target_path, '-vframes', '1', '-vf', 'scale=1280:-1', dest_path]
        subprocess.run(cmd, capture_output=True)
    else:
        raise HTTPException(status_code=400, detail="Вкажіть файл або таймкод кадру")

    norm_dest = dest_path.replace('\\', '/')
    cur_rec = database.get_record(target_path)
    cur_status = cur_rec.get("status", "planning") if cur_rec else "planning"
    database.update_status(path=target_path, status=cur_status, custom_thumb_path=norm_dest)
    return {
        "success": True,
        "custom_thumb_path": norm_dest,
        "thumb_url": f"/api/thumbnail?path={target_path}&cb={int(datetime.utcnow().timestamp())}"
    }

@router.get("/video-stream")
def stream_video(path: str):
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Файл не знайдено")
    return FileResponse(path, media_type="video/mp4")

class StatusUpdateRequest(BaseModel):
    path: str
    status: str # 'planning', 'scheduled', 'posted'
    scheduled_for: Optional[str] = None
    youtube_url: Optional[str] = None
    title: Optional[str] = None
    default_lang: Optional[str] = None
    localizations: Optional[Dict[str, Any]] = None
    custom_thumb_path: Optional[str] = None

@router.post("/video/status")
def update_video_status(req: StatusUpdateRequest):
    if req.status not in ('planning', 'scheduled', 'posted'):
        raise HTTPException(status_code=400, detail="Невірний статус. Дозволені: planning, scheduled, posted")
    
    record = database.update_status(
        path=req.path,
        status=req.status,
        scheduled_for=req.scheduled_for,
        youtube_url=req.youtube_url,
        title=req.title,
        default_lang=req.default_lang,
        localizations=req.localizations,
        custom_thumb_path=req.custom_thumb_path
    )
    return {"success": True, "record": record}

class DeleteVideoRequest(BaseModel):
    path: str

@router.post("/videos/delete")
def delete_video(req: DeleteVideoRequest):
    raw_path = req.path.replace('\\', '/')
    abs_path = os.path.abspath(raw_path)
    abs_base = os.path.abspath(BASE_DIR)

    if not abs_path.lower().startswith(abs_base.lower()):
        raise HTTPException(status_code=400, detail="Неприпустимий шлях до файлу")

    if not os.path.exists(abs_path):
        raise HTTPException(status_code=404, detail="Файл не знайдено на локальному диску")

    if not os.path.isfile(abs_path):
        raise HTTPException(status_code=400, detail="Шлях не є файлом")

    if not abs_path.lower().endswith(('.mp4', '.mov', '.mkv', '.avi', '.webm')):
        raise HTTPException(status_code=400, detail="Файл не є відеофайлом")

    filename = os.path.basename(abs_path)

    try:
        database.delete_record(raw_path)
    except Exception as e:
        logger.warning(f"Error removing db record for {raw_path}: {e}")

    try:
        safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', filename)
        if os.path.exists(THUMB_CACHE):
            for f in os.listdir(THUMB_CACHE):
                if f.startswith(safe_name):
                    try:
                        os.remove(os.path.join(THUMB_CACHE, f))
                    except Exception:
                        pass
    except Exception as e:
        logger.warning(f"Error cleaning thumb cache for {filename}: {e}")

    try:
        os.remove(abs_path)
        logger.info(f"Successfully deleted local video file: {abs_path}")
        parent_dir = os.path.dirname(abs_path)
        if os.path.basename(parent_dir).lower() == 'archive' and os.path.exists(parent_dir) and not os.listdir(parent_dir):
            try:
                os.rmdir(parent_dir)
            except Exception:
                pass
    except Exception as e:
        logger.error(f"Failed to delete file {abs_path}: {e}")
        raise HTTPException(status_code=500, detail=f"Помилка видалення файлу з диска: {str(e)}")

    return {"success": True, "message": f"Файл {filename} успішно видалено з диска"}

class ArchiveVideoRequest(BaseModel):
    path: str

@router.post("/videos/archive")
def archive_video(req: ArchiveVideoRequest):
    raw_path = req.path.replace('\\', '/')
    abs_path = os.path.abspath(raw_path)
    abs_base = os.path.abspath(BASE_DIR)

    if not abs_path.lower().startswith(abs_base.lower()):
        raise HTTPException(status_code=400, detail="Неприпустимий шлях до файлу")

    if not os.path.exists(abs_path) or not os.path.isfile(abs_path):
        raise HTTPException(status_code=404, detail="Файл не знайдено на локальному диску")

    video_exts = ('.mp4', '.mov', '.mkv', '.avi', '.webm')
    if not abs_path.lower().endswith(video_exts):
        raise HTTPException(status_code=400, detail="Файл не є відеофайлом")

    parent_dir = os.path.dirname(abs_path)
    if os.path.basename(parent_dir).lower() == 'archive':
        return {
            "success": True,
            "message": "Файл уже знаходиться в архіві",
            "path": raw_path,
            "is_archived": True
        }

    archive_dir = os.path.join(parent_dir, "archive")
    os.makedirs(archive_dir, exist_ok=True)

    filename = os.path.basename(abs_path)
    target_path = os.path.join(archive_dir, filename)

    if os.path.exists(target_path):
        name, ext = os.path.splitext(filename)
        timestamp = int(datetime.utcnow().timestamp())
        target_path = os.path.join(archive_dir, f"{name}_{timestamp}{ext}")

    try:
        shutil.move(abs_path, target_path)
        logger.info(f"Moved video to archive: {abs_path} -> {target_path}")
    except Exception as e:
        logger.error(f"Failed to move file to archive {abs_path}: {e}")
        raise HTTPException(status_code=500, detail=f"Помилка переміщення файлу в архів: {str(e)}")

    norm_target = target_path.replace('\\', '/')
    try:
        database.move_record(raw_path, norm_target)
    except Exception as e:
        logger.warning(f"Error updating database path for {raw_path} -> {norm_target}: {e}")

    return {
        "success": True,
        "message": f"Файл {filename} успішно переміщено в архів",
        "old_path": raw_path,
        "path": norm_target,
        "is_archived": True
    }

@router.post("/videos/unarchive")
def unarchive_video(req: ArchiveVideoRequest):
    raw_path = req.path.replace('\\', '/')
    abs_path = os.path.abspath(raw_path)
    abs_base = os.path.abspath(BASE_DIR)

    if not abs_path.lower().startswith(abs_base.lower()):
        raise HTTPException(status_code=400, detail="Неприпустимий шлях до файлу")

    if not os.path.exists(abs_path) or not os.path.isfile(abs_path):
        raise HTTPException(status_code=404, detail="Файл не знайдено на локальному диску")

    video_exts = ('.mp4', '.mov', '.mkv', '.avi', '.webm')
    if not abs_path.lower().endswith(video_exts):
        raise HTTPException(status_code=400, detail="Файл не є відеофайлом")

    archive_dir = os.path.dirname(abs_path)
    if os.path.basename(archive_dir).lower() != 'archive':
        raise HTTPException(status_code=400, detail="Файл не знаходиться в папці архіву")

    parent_dir = os.path.dirname(archive_dir)
    filename = os.path.basename(abs_path)
    target_path = os.path.join(parent_dir, filename)

    if os.path.exists(target_path):
        name, ext = os.path.splitext(filename)
        timestamp = int(datetime.utcnow().timestamp())
        target_path = os.path.join(parent_dir, f"{name}_{timestamp}{ext}")

    try:
        shutil.move(abs_path, target_path)
        logger.info(f"Restored video from archive: {abs_path} -> {target_path}")
    except Exception as e:
        logger.error(f"Failed to restore file from archive {abs_path}: {e}")
        raise HTTPException(status_code=500, detail=f"Помилка відновлення файлу з архіву: {str(e)}")

    norm_target = target_path.replace('\\', '/')
    try:
        database.move_record(raw_path, norm_target)
    except Exception as e:
        logger.warning(f"Error updating database path for {raw_path} -> {norm_target}: {e}")

    # Remove archive directory if it is now empty
    try:
        if os.path.exists(archive_dir) and not os.listdir(archive_dir):
            os.rmdir(archive_dir)
    except Exception as e:
        logger.debug(f"Could not remove empty archive dir {archive_dir}: {e}")

    return {
        "success": True,
        "message": f"Файл {filename} успішно відновлено з архіву",
        "old_path": raw_path,
        "path": norm_target,
        "is_archived": False
    }

@router.get("/calendar")
def get_calendar():
    """Returns scheduled and posted videos grouped by date from SQLite."""
    return database.get_calendar_map()

@router.get("/history")
def get_history():
    """Returns all scheduled and posted records from SQLite."""
    return database.get_history_records()

@router.post("/tools/launch-losslesscut")
def launch_losslesscut():
    exe_path = os.path.join(ROOT_DIR, "tools", "LosslessCut", "LosslessCut.exe")
    if os.path.exists(exe_path):
        subprocess.Popen([exe_path], cwd=os.path.dirname(exe_path))
        return {"success": True, "message": "LosslessCut запущено"}
    raise HTTPException(status_code=404, detail="LosslessCut не знайдено за шляхом " + exe_path)
