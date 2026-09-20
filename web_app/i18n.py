# -*- coding: utf-8 -*-
import os
from typing import Optional

DEFAULT_LANG = os.getenv("APP_LANG", "uk").lower()
SUPPORTED_LANGS = ["uk", "en"]

TRANSLATIONS = {
    "uk": {
        "app.title": "YouTube Scheduler",
        "status.planning": "⏳ В планах",
        "status.scheduled": "🕒 Заплановано",
        "status.posted": "✅ Запощено",
        "shorts.description": "Швидкий епізод з {base_name}. Підписуйтесь на канал!\n\n#Shorts #Viral #Highlights",
        "shorts.default_title": "{base_name} (Shorts)",
        "shorts.tags": ["Shorts", "Highlights", "Viral"],
        "error.file_not_found": "Вихідний файл не знайдено",
        "error.ffmpeg_error": "Помилка кодування FFmpeg: {detail}",
        "error.invalid_status": "Невірний статус. Дозволені: planning, scheduled, posted",
        "error.auth_required": "Потрібна авторизація в YouTube",
        "auth.login_success": "Успішно підключено до YouTube!",
        "auth.login_error": "Помилка входу в Google: {error}",
        "schedule.success": "Відео заплановано на YouTube (ID: {id})",
        "schedule.error": "Помилка планування: {error}"
    },
    "en": {
        "app.title": "YouTube Scheduler",
        "status.planning": "⏳ In Planning",
        "status.scheduled": "🕒 Scheduled",
        "status.posted": "✅ Posted",
        "shorts.description": "Quick highlight from {base_name}. Subscribe for more!\n\n#Shorts #Viral #Highlights",
        "shorts.default_title": "{base_name} (Shorts)",
        "shorts.tags": ["Shorts", "Highlights", "Viral"],
        "error.file_not_found": "Source file not found",
        "error.ffmpeg_error": "FFmpeg encoding error: {detail}",
        "error.invalid_status": "Invalid status. Allowed: planning, scheduled, posted",
        "error.auth_required": "YouTube authorization required",
        "auth.login_success": "Successfully connected to YouTube!",
        "auth.login_error": "Google sign-in error: {error}",
        "schedule.success": "Video scheduled on YouTube (ID: {id})",
        "schedule.error": "Scheduling error: {error}"
    }
}

def resolve_lang(lang: Optional[str] = None, accept_language: Optional[str] = None) -> str:
    if lang and lang.lower() in SUPPORTED_LANGS:
        return lang.lower()
    
    if accept_language:
        lower_hdr = accept_language.lower()
        for sl in SUPPORTED_LANGS:
            if sl in lower_hdr:
                return sl
                
    return DEFAULT_LANG if DEFAULT_LANG in SUPPORTED_LANGS else "uk"

def t(key: str, lang: Optional[str] = None, **kwargs) -> str:
    target_lang = resolve_lang(lang)
    lang_dict = TRANSLATIONS.get(target_lang, TRANSLATIONS.get("uk", {}))
    template = lang_dict.get(key)
    
    if template is None:
        template = TRANSLATIONS.get("uk", {}).get(key, key)
        
    if isinstance(template, str) and kwargs:
        try:
            return template.format(**kwargs)
        except Exception:
            return template
            
    return template
