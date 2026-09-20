import os
import logging

BASE_DIR = 'e:/youtube'
STATIC_DIR = os.path.join(BASE_DIR, 'web_app', 'static')
THUMB_CACHE = os.path.join(BASE_DIR, 'web_app', 'cache', 'thumbs')
LOG_FILE = os.path.join(BASE_DIR, 'web_app', 'app.log')

os.makedirs(THUMB_CACHE, exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)

logger = logging.getLogger("API")
