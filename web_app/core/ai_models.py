import os
from typing import List, Dict, Any, Optional
import database

AVAILABLE_MODELS: List[Dict[str, Any]] = [
    {
        "id": "gemini-2.5-flash",
        "name": "Gemini 2.5 Flash",
        "badge": "⚡ Рекомендовано",
        "description": "Найновіший флагман Google. Ідеальний баланс швидкості, аналізу кадрів та якості сценаріїв.",
        "supports_vision": True,
        "supports_text": True,
        "context_window": "1 000 000+ токенів",
        "speed": "Ультра-швидка"
    },
    {
        "id": "gemini-2.0-flash",
        "name": "Gemini 2.0 Flash",
        "badge": "🔥 Висока стабільність",
        "description": "Швидка та надійна мультимодальна модель з перевіреною стабільністю у продакшені.",
        "supports_vision": True,
        "supports_text": True,
        "context_window": "1 000 000+ токенів",
        "speed": "Ультра-швидка"
    },
    {
        "id": "gemini-flash-latest",
        "name": "Gemini Flash Latest",
        "badge": "🔄 Auto Latest",
        "description": "Автоматично підключає найсвіжіший реліз Flash від Google без необхідності оновлення.",
        "supports_vision": True,
        "supports_text": True,
        "context_window": "1 000 000+ токенів",
        "speed": "Ультра-швидка"
    },
    {
        "id": "gemini-flash-lite-latest",
        "name": "Gemini Flash Lite",
        "badge": "🪶 Легковажна",
        "description": "Ультра-економна та швидка модель для миттєвої генерації тегів та коротких сценаріїв.",
        "supports_vision": True,
        "supports_text": True,
        "context_window": "1 000 000+ токенів",
        "speed": "Блискавична"
    },
    {
        "id": "gemini-2.5-pro",
        "name": "Gemini 2.5 Pro",
        "badge": "🧠 Глибокий інтелект",
        "description": "Важка модель з максимальним розумінням складних сюжетних арок та глибоких контекстів.",
        "supports_vision": True,
        "supports_text": True,
        "context_window": "2 000 000+ токенів",
        "speed": "Помірна"
    },
    {
        "id": "gemini-pro-latest",
        "name": "Gemini Pro Latest",
        "badge": "🎯 Pro Production",
        "description": "Флагманська модель лінійки Pro для складного аналізу.",
        "supports_vision": True,
        "supports_text": True,
        "context_window": "2 000 000+ токенів",
        "speed": "Помірна"
    },
    {
        "id": "custom",
        "name": "Власна / Експериментальна модель",
        "badge": "🧪 Custom",
        "description": "Вкажіть будь-який рядок моделі Google Gemini (наприклад gemini-2.0-flash-exp чи майбутні версії).",
        "supports_vision": True,
        "supports_text": True,
        "context_window": "Залежить від моделі",
        "speed": "Custom"
    }
]

DEFAULT_FALLBACKS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-pro-latest"
]

def get_active_vision_model() -> str:
    """Gets currently configured model for video frame storyboard analysis."""
    custom = database.get_setting("ai_custom_vision_model", "").strip()
    if custom:
        return custom
    return database.get_setting("ai_vision_model", "gemini-2.5-flash").strip() or "gemini-2.5-flash"

def get_active_text_model() -> str:
    """Gets currently configured model for metadata, scripts, and descriptions."""
    custom = database.get_setting("ai_custom_text_model", "").strip()
    if custom:
        return custom
    return database.get_setting("ai_text_model", "gemini-2.5-flash").strip() or "gemini-2.5-flash"

def get_model_cascade(primary_model: str) -> List[str]:
    """
    Returns ordered list of models to try.
    The primary model is always tried first, followed by resilient fallbacks.
    """
    cascade = [primary_model]
    for fb in DEFAULT_FALLBACKS:
        if fb not in cascade:
            cascade.append(fb)
    return cascade
