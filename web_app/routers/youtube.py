import os
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

import database
import youtube_uploader
from core.config import logger

router = APIRouter()

@router.get("/auth/status")
def auth_status():
    return youtube_uploader.get_auth_status()

@router.get("/auth/url")
def auth_url(request: Request):
    try:
        redirect_uri = "http://localhost:8000/api/auth/callback"
        url, state = youtube_uploader.get_auth_url(redirect_uri=redirect_uri)
        return {"url": url, "state": state}
    except Exception as e:
        logger.error(f"Error generating auth url: {e}")
        raise HTTPException(status_code=500, detail=f"Помилка створення посилання авторизації: {str(e)}")

@router.get("/auth/callback")
def auth_callback(request: Request, code: Optional[str] = None, state: Optional[str] = None, error: Optional[str] = None):
    if error:
        return HTMLResponse(f"""
        <!DOCTYPE html>
        <html>
        <body style="background:#0f0f0f;color:#ff5555;font-family:sans-serif;padding:40px;text-align:center;">
          <h2>Помилка авторизації від Google</h2>
          <p>{error}</p>
        </body>
        </html>
        """, status_code=400)

    if not code:
        return HTMLResponse("""
        <!DOCTYPE html>
        <html>
        <body style="background:#0f0f0f;color:#ff5555;font-family:sans-serif;padding:40px;text-align:center;">
          <h2>Код авторизації не отримано</h2>
        </body>
        </html>
        """, status_code=400)

    try:
        redirect_uri = "http://localhost:8000/api/auth/callback"
        youtube_uploader.finish_oauth(state=state, code=code, auth_response=str(request.url), redirect_uri=redirect_uri)
        return HTMLResponse("""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>YouTube Авторизація</title>
          <style>
            body {
              background-color: #0f0f0f;
              color: #f1f1f1;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
            }
            .card {
              background: #212121;
              border: 1px solid #3e3e3e;
              border-radius: 16px;
              padding: 36px 48px;
              text-align: center;
              box-shadow: 0 12px 30px rgba(0,0,0,0.6);
            }
            .icon {
              width: 52px;
              height: 52px;
              background: rgba(62, 166, 255, 0.15);
              color: #3ea6ff;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 26px;
              font-weight: bold;
              margin: 0 auto 16px;
            }
            h2 { margin: 0 0 8px; font-size: 20px; font-weight: 600; color: #f1f1f1; }
            p { margin: 0; color: #aaaaaa; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">✓</div>
            <h2>YouTube канал успішно підключено!</h2>
            <p>Це вікно зараз закриється автоматично...</p>
          </div>
          <script>
            try {
              if (window.opener) {
                window.opener.postMessage({ type: 'YOUTUBE_AUTH_SUCCESS' }, '*');
              }
            } catch(e) {}
            setTimeout(function() {
              window.close();
              setTimeout(function() {
                window.location.href = 'http://localhost:3000';
              }, 500);
            }, 1200);
          </script>
        </body>
        </html>
        """)
    except Exception as e:
        logger.error(f"Callback error: {e}", exc_info=True)
        return HTMLResponse(f"""
        <!DOCTYPE html>
        <html>
        <body style="background:#0f0f0f;color:#ff5555;font-family:sans-serif;padding:40px;text-align:center;">
          <h2>Помилка завершення авторизації</h2>
          <p>{str(e)}</p>
        </body>
        </html>
        """, status_code=500)

@router.post("/auth/login")
def auth_login():
    try:
        youtube_uploader.authenticate(prompt_select=True)
        return {"success": True, "message": "Успішно підключено до YouTube!"}
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail=f"Помилка входу: {str(e)}")

@router.post("/auth/logout")
def auth_logout():
    try:
        youtube_uploader.logout()
        return {"success": True, "message": "Успішно відключено від YouTube"}
    except Exception as e:
        logger.error(f"Logout error: {e}")
        raise HTTPException(status_code=500, detail=f"Помилка виходу: {str(e)}")

class ScheduleRequest(BaseModel):
    video_path: str = Field(..., description="Absolute path to video file")
    title: str = Field(..., max_length=100, description="Title of the video (max 100 chars)")
    description: str = Field("", max_length=5000, description="Description (max 5000 chars)")
    tags: List[str] = Field(default_factory=list, description="List of tags")
    privacy: str = Field("scheduled", description="scheduled | private | unlisted | public")
    publish_at: Optional[str] = Field(None, description="ISO datetime string for scheduled release")
    is_shorts: bool = Field(False, description="Whether this video is a YouTube Short")
    default_lang: Optional[str] = Field("en", description="Default language")
    localizations: Optional[Dict[str, Any]] = Field(None, description="Localizations dict")
    custom_thumb_path: Optional[str] = Field(None, description="Custom thumbnail image path")

@router.post("/youtube/schedule")
def schedule_upload(req: ScheduleRequest):
    try:
        logger.info(f"schedule_upload called with title='{req.title}', req.tags={req.tags}")
        is_scheduled = bool(req.publish_at) or req.privacy == "scheduled"
        target_privacy = "private" if is_scheduled else req.privacy
        target_publish_at = req.publish_at if is_scheduled else None

        cleaned_tags = youtube_uploader.sanitize_youtube_tags(req.tags)
        logger.info(f"schedule_upload cleaned_tags={cleaned_tags}")
        record = youtube_uploader.upload_and_schedule(
            file_path=req.video_path,
            title=req.title,
            description=req.description,
            tags=cleaned_tags,
            privacy_status=target_privacy,
            publish_at=target_publish_at,
            is_shorts=req.is_shorts,
            default_language=req.default_lang or "en",
            localizations=req.localizations,
            custom_thumb_path=req.custom_thumb_path
        )
        final_status = "scheduled" if target_publish_at else "posted"
        database.upsert_record(
            path=req.video_path,
            filename=os.path.basename(req.video_path),
            title=req.title,
            description=req.description,
            tags=cleaned_tags,
            is_shorts=req.is_shorts,
            status=final_status,
            scheduled_for=target_publish_at,
            youtube_id=record.get("id"),
            youtube_url=record.get("url"),
            uploaded_at=record.get("uploaded_at"),
            default_lang=req.default_lang,
            localizations=req.localizations,
            custom_thumb_path=req.custom_thumb_path
        )
        return {"success": True, "record": record}
    except Exception as e:
        logger.error(f"Scheduling error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/videos/sync-status")
def sync_status():
    """
    Performs two-tier status synchronization:
    1. Local time-based sync: flips elapsed scheduled videos to 'posted'.
    2. YouTube API sync: checks YouTube for public privacyStatus.
    """
    local_synced = database.sync_scheduled_statuses()
    yt_synced = 0
    
    try:
        with database.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT path, youtube_id FROM video_records WHERE status = 'scheduled' AND youtube_id IS NOT NULL")
            candidates = cursor.fetchall()
            if candidates:
                id_to_path = {c["youtube_id"]: c["path"] for c in candidates}
                statuses = youtube_uploader.check_youtube_publish_statuses(list(id_to_path.keys()))
                now_str = datetime.utcnow().isoformat() + "Z"
                for y_id, p_status in statuses.items():
                    if p_status == "public":
                        p = id_to_path[y_id]
                        cursor.execute("UPDATE video_records SET status = 'posted', updated_at = ? WHERE path = ?", (now_str, p))
                        yt_synced += 1
                conn.commit()
    except Exception as e:
        logger.warning(f"Error during YouTube API status sync: {e}")
        
    return {
        "success": True,
        "local_synced": local_synced,
        "youtube_synced": yt_synced,
        "total_synced": local_synced + yt_synced
    }
