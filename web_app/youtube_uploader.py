import os
import re
import json
import pickle
import time
import logging
from datetime import datetime
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from googleapiclient.errors import HttpError
from google_auth_oauthlib.flow import InstalledAppFlow, Flow
from google.auth.transport.requests import Request
import socket
from typing import Optional, Dict

os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
os.environ['OAUTHLIB_RELAX_TOKEN_SCOPE'] = '1'

# Setup logging
LOG_FILE = 'e:/youtube/web_app/app.log'
logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger("YouTubeUploader")

SCOPES = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly'
]

from core.config import ROOT_DIR
CLIENT_SECRETS_FILE = os.path.join(ROOT_DIR, 'client_secret.json').replace('\\', '/')
TOKEN_FILE = os.path.join(ROOT_DIR, 'token.pickle').replace('\\', '/')
HISTORY_FILE = os.path.join(ROOT_DIR, 'web_app', 'uploads_history.json').replace('\\', '/')

RETRIABLE_EXCEPTIONS = (
    socket.error,
    socket.timeout,
    TimeoutError
)
RETRIABLE_STATUS_CODES = [500, 502, 503, 504]

def sanitize_youtube_tag(tag: str) -> str:
    """
    Sanitizes an individual tag to strictly comply with YouTube Data API v3 rules:
    - No emojis (code points >= 0x10000, surrogate pairs, pictographs, symbols)
    - No angle brackets (<, >)
    - No hashtags (#)
    - No quotes, commas, colons, or control characters (\\n, \\r, \\t)
    - Maximum 100 characters per tag
    - Cleaned of leading/trailing non-alphanumeric punctuation
    """
    if not tag or not isinstance(tag, str):
        return ""
    # Strip emojis (high unicode code points >= 0x10000)
    t = re.sub(r'[\U00010000-\U0010ffff]', '', tag)
    # Remove surrogate pairs
    t = re.sub(r'[\ud800-\udfff]', '', t)
    # Remove additional emoji/symbol unicode blocks (dingbats, pictographs, symbols, arrows)
    t = re.sub(r'[\u2600-\u27bf\u2300-\u23ff\u2b50\u200d\ufe0f\u20e3\u2190-\u21ff\u2900-\u297f]', '', t)
    # Remove prohibited and problematic symbols: #, <, >, commas, quotes, exclamation, question marks, colons, etc.
    t = re.sub(r'[#<>,!?:;`"\'\r\n\t~^=+$%&*()\[\]{}|\\\/]', ' ', t)
    # Replace multiple spaces with a single space
    t = re.sub(r'\s+', ' ', t).strip()
    # Strip leading/trailing hyphens, underscores or dots
    t = t.strip(' -_.')
    return t[:100]

def sanitize_youtube_tags(tags: list, max_total_length: int = 430) -> list:
    """
    Sanitizes tag list and enforces YouTube's internal 500-character limit.
    CRITICAL: YouTube formats multi-word tags with double quotes ("word word"),
    so tags with spaces consume len(tag) + 2 characters in YouTube's internal validator.
    We enforce a safety threshold of max_total_length (default 430) to ensure 100% compliance.
    """
    cleaned = []
    seen = set()
    total_len = 0
    for item in (tags or []):
        clean_t = sanitize_youtube_tag(str(item))
        if not clean_t:
            continue
        lower_t = clean_t.lower()
        if lower_t in seen:
            continue
        tag_cost = len(clean_t) + (2 if ' ' in clean_t else 0)
        delimiter_cost = 1 if cleaned else 0
        added_len = tag_cost + delimiter_cost
        if total_len + added_len > max_total_length:
            break
        cleaned.append(clean_t)
        seen.add(lower_t)
        total_len += added_len
    return cleaned

def get_auth_status():
    if not os.path.exists(CLIENT_SECRETS_FILE):
        return {
            "authenticated": False,
            "has_secret": False,
            "channel_title": None,
            "message": "client_secret.json не знайдено в e:/youtube"
        }
    
    if os.path.exists(TOKEN_FILE):
        try:
            with open(TOKEN_FILE, 'rb') as f:
                creds = pickle.load(f)
            if creds:
                if creds.expired and creds.refresh_token:
                    creds.refresh(Request())
                    with open(TOKEN_FILE, 'wb') as f:
                        pickle.dump(creds, f)
                if creds.valid:
                    # fetch rich channel identity
                    channel_info = {
                        "id": None,
                        "title": "Мій YouTube Канал",
                        "handle": None,
                        "avatar": None,
                        "subscriber_count": None,
                        "video_count": None,
                        "custom_url": None
                    }
                    try:
                        yt = build('youtube', 'v3', credentials=creds)
                        ch_req = yt.channels().list(part="snippet,statistics", mine=True)
                        ch_res = ch_req.execute()
                        if ch_res.get("items"):
                            item = ch_res["items"][0]
                            snippet = item.get("snippet", {})
                            stats = item.get("statistics", {})
                            thumbs = snippet.get("thumbnails", {})
                            avatar_url = (
                                thumbs.get("medium", {}).get("url") or 
                                thumbs.get("default", {}).get("url") or 
                                thumbs.get("high", {}).get("url")
                            )
                            handle = snippet.get("customUrl")
                            channel_info = {
                                "id": item.get("id"),
                                "title": snippet.get("title", "Мій YouTube Канал"),
                                "handle": handle,
                                "avatar": avatar_url,
                                "subscriber_count": stats.get("subscriberCount"),
                                "video_count": stats.get("videoCount"),
                                "custom_url": f"https://youtube.com/{handle}" if handle else f"https://youtube.com/channel/{item.get('id')}"
                            }
                    except Exception as ch_err:
                        logger.warning(f"Could not fetch channel details: {ch_err}")
                        
                    return {
                        "authenticated": True,
                        "has_secret": True,
                        "channel_title": channel_info["title"],
                        "channel_id": channel_info["id"],
                        "channel_handle": channel_info["handle"],
                        "channel_avatar": channel_info["avatar"],
                        "subscriber_count": channel_info["subscriber_count"],
                        "video_count": channel_info["video_count"],
                        "custom_url": channel_info["custom_url"]
                    }
        except Exception as e:
            logger.error(f"Auth check failed: {e}")
            return {"authenticated": False, "has_secret": True, "error": str(e)}
            
    return {"authenticated": False, "has_secret": True, "channel_title": None}

_oauth_flows: Dict[str, Flow] = {}

def get_auth_url(redirect_uri: str = "http://localhost:8000/api/auth/callback"):
    if not os.path.exists(CLIENT_SECRETS_FILE):
        raise FileNotFoundError(f"Файл {CLIENT_SECRETS_FILE} відсутній.")
    
    flow = Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE,
        scopes=SCOPES,
        redirect_uri=redirect_uri
    )
    auth_url, state = flow.authorization_url(
        prompt='select_account',
        access_type='offline',
        include_granted_scopes='true'
    )
    _oauth_flows[state] = flow
    return auth_url, state

def finish_oauth(state: Optional[str], code: str, auth_response: str, redirect_uri: str = "http://localhost:8000/api/auth/callback"):
    flow = None
    if state and state in _oauth_flows:
        flow = _oauth_flows.pop(state)
    
    if not flow:
        flow = Flow.from_client_secrets_file(
            CLIENT_SECRETS_FILE,
            scopes=SCOPES,
            redirect_uri=redirect_uri
        )
    
    try:
        flow.fetch_token(authorization_response=auth_response)
    except Exception as e:
        logger.warning(f"fetch_token by authorization_response failed: {e}. Trying by code...")
        flow.fetch_token(code=code)
        
    creds = flow.credentials
    with open(TOKEN_FILE, 'wb') as f:
        pickle.dump(creds, f)
    logger.info("Successfully authenticated via web callback and saved token.pickle")
    return creds

def authenticate(prompt_select: bool = True):
    if not os.path.exists(CLIENT_SECRETS_FILE):
        raise FileNotFoundError(f"Файл {CLIENT_SECRETS_FILE} відсутній.")
    
    flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRETS_FILE, SCOPES)
    # prompt='select_account' forces Google to show the account & channel picker
    if prompt_select:
        creds = flow.run_local_server(port=0, prompt='select_account')
    else:
        creds = flow.run_local_server(port=0)
        
    with open(TOKEN_FILE, 'wb') as f:
        pickle.dump(creds, f)
    logger.info("Successfully authenticated and saved token.pickle")
    return creds

def logout():
    if os.path.exists(TOKEN_FILE):
        try:
            os.remove(TOKEN_FILE)
            logger.info("Successfully removed token.pickle (Logged out)")
            return True
        except Exception as e:
            logger.error(f"Error removing token.pickle: {e}")
            raise e
    return True

def get_service():
    if not os.path.exists(TOKEN_FILE):
        raise RuntimeError("Немає збереженої авторизації. Натисніть 'Підключити YouTube' у додатку.")
    with open(TOKEN_FILE, 'rb') as f:
        creds = pickle.load(f)
    if not creds:
        raise RuntimeError("Порожній токен авторизації.")
    if creds.expired and creds.refresh_token:
        logger.info("Refreshing expired OAuth token...")
        creds.refresh(Request())
        with open(TOKEN_FILE, 'wb') as f:
            pickle.dump(creds, f)
    if not creds.valid:
        raise RuntimeError("Токен авторизації недійсний. Потрібно перепідключити акаунт.")
    return build('youtube', 'v3', credentials=creds)

def upload_and_schedule(
    file_path: str,
    title: str,
    description: str,
    tags: list,
    privacy_status: str,
    publish_at: str = None,
    is_shorts: bool = False,
    default_language: str = "en",
    localizations: dict = None,
    custom_thumb_path: str = None
):
    youtube = get_service()
    
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Відеофайл не знайдено: {file_path}")
        
    # Clean tags: YouTube tags are keywords (strictly no emojis, <>, #, quotes, control chars, max 430 chars total internal quoted length)
    tags = sanitize_youtube_tags(tags or [], max_total_length=430)

    # Best Practice for Shorts: append #Shorts if not present
    if is_shorts:
        if '#Shorts' not in title and '#shorts' not in title:
            if len(title) + 8 <= 100:
                title = f"{title} #Shorts"
        if '#Shorts' not in description and '#shorts' not in description:
            description = f"{description}\n\n#Shorts #Gaming"
        if 'Shorts' not in tags and 'shorts' not in [t.lower() for t in tags]:
            quoted_len = sum(len(t) + (2 if ' ' in t else 0) for t in tags) + (len(tags) - 1 if tags else 0)
            if quoted_len + 7 <= 450:
                tags.append('Shorts')

    status_body = {
        "selfDeclaredMadeForKids": False
    }
    
    # YouTube API rule: If publishAt is set, privacyStatus MUST be 'private'
    if publish_at:
        status_body["privacyStatus"] = "private"
        clean_publish = publish_at.replace('+00:00', 'Z')
        if not clean_publish.endswith('Z') and '+' not in clean_publish:
            clean_publish += 'Z'
        status_body["publishAt"] = clean_publish
    else:
        status_body["privacyStatus"] = privacy_status or "private"
        
    snippet_body = {
        "title": title[:100],
        "description": description[:5000],
        "tags": tags or [],
        "categoryId": "20",
        "defaultLanguage": default_language or "en",
        "defaultAudioLanguage": default_language or "en"
    }

    body = {
        "snippet": snippet_body,
        "status": status_body
    }

    parts = ["snippet", "status"]
    if localizations and isinstance(localizations, dict):
        clean_loc = {}
        for l_code, l_data in localizations.items():
            if isinstance(l_data, dict) and l_data.get("title"):
                clean_loc[l_code] = {
                    "title": str(l_data.get("title", ""))[:100],
                    "description": str(l_data.get("description", ""))[:5000]
                }
        if clean_loc:
            body["localizations"] = clean_loc
            parts.append("localizations")
    
    logger.info(f"Starting upload for: {file_path} | Title: {title} | Status: {status_body}")
    logger.info(f"Snippet tags being sent to YouTube: {snippet_body.get('tags')}")
    logger.info(f"Full body keys: {list(body.keys())}")
    
    media = MediaFileUpload(file_path, chunksize=1024*1024*5, resumable=True)
    request = youtube.videos().insert(
        part=",".join(parts),
        body=body,
        media_body=media
    )
    
    response = None
    retry_count = 0
    max_retries = 5
    
    while response is None:
        try:
            status, response = request.next_chunk()
            if status:
                pct = int(status.progress() * 100)
                logger.info(f"Upload progress: {pct}%")
        except HttpError as err:
            if err.resp.status in RETRIABLE_STATUS_CODES:
                retry_count += 1
                if retry_count > max_retries:
                    logger.error(f"Max retries exceeded on HTTP error: {err}")
                    raise
                sleep_sec = 2 ** retry_count
                logger.warning(f"Retriable HTTP error {err.resp.status}. Retrying in {sleep_sec}s...")
                time.sleep(sleep_sec)
            else:
                logger.error(f"Fatal YouTube HTTP error ({err.resp.status}): {err}")
                raise
        except RETRIABLE_EXCEPTIONS as err:
            retry_count += 1
            if retry_count > max_retries:
                logger.error(f"Max retries exceeded on network error: {err}")
                raise
            sleep_sec = 2 ** retry_count
            logger.warning(f"Retriable network error during upload: {err}. Retrying in {sleep_sec}s...")
            time.sleep(sleep_sec)
                
    video_id = response.get("id")
    video_url = f"https://youtu.be/{video_id}"
    logger.info(f"Upload complete! Video ID: {video_id} | URL: {video_url}")
    
    # Upload custom thumbnail if provided
    if custom_thumb_path and os.path.exists(custom_thumb_path):
        try:
            logger.info(f"Setting custom thumbnail for video {video_id} from {custom_thumb_path}...")
            thumb_media = MediaFileUpload(custom_thumb_path, mimetype="image/jpeg", resumable=False)
            youtube.thumbnails().set(videoId=video_id, media_body=thumb_media).execute()
            logger.info(f"Custom thumbnail successfully set for video {video_id}!")
        except Exception as th_err:
            logger.warning(f"Failed to set custom thumbnail: {th_err}")

    # Save record
    record = {
        "id": video_id,
        "title": title,
        "url": video_url,
        "is_shorts": is_shorts,
        "scheduled_for": status_body.get("publishAt"),
        "privacy": "scheduled" if status_body.get("publishAt") else status_body.get("privacyStatus"),
        "uploaded_at": datetime.utcnow().isoformat() + "Z",
        "file": os.path.basename(file_path),
        "file_path": file_path
    }
    
    history = []
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
                history = json.load(f)
        except Exception:
            history = []
            
    history.insert(0, record)
    with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
        json.dump(history, f, indent=2, ensure_ascii=False)
        
    return record

def check_youtube_publish_statuses(video_ids: list) -> dict:
    """
    Batches up to 50 video IDs to YouTube Data API v3 videos().list(part="status").
    Returns {video_id: privacyStatus} e.g. {'dQw4w9WgXcQ': 'public'}
    """
    if not video_ids or not os.path.exists(TOKEN_FILE):
        return {}
    
    results = {}
    try:
        youtube = get_service()
        # Chunk in groups of 50
        for i in range(0, len(video_ids), 50):
            chunk = video_ids[i:i+50]
            req = youtube.videos().list(
                part="status",
                id=",".join(chunk)
            )
            res = req.execute()
            for item in res.get("items", []):
                vid = item.get("id")
                st = item.get("status", {}).get("privacyStatus")
                if vid and st:
                    results[vid] = st
    except Exception as e:
        logger.warning(f"Failed to check YouTube video statuses: {e}")
        
    return results
