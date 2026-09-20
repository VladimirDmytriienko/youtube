import os
import logging

# Project Root Directory (auto-detected relative to this config file)
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))).replace('\\', '/')

# Dedicated Working Directory for all user videos, footage, and output clips
PROJECTS_DIR = os.getenv('PROJECTS_DIR', os.path.join(ROOT_DIR, 'projects')).replace('\\', '/')
BASE_DIR = PROJECTS_DIR  # Primary working media folder

STATIC_DIR = os.path.join(ROOT_DIR, 'web_app', 'static').replace('\\', '/')
THUMB_CACHE = os.path.join(ROOT_DIR, 'web_app', 'cache', 'thumbs').replace('\\', '/')
LOG_FILE = os.path.join(ROOT_DIR, 'web_app', 'app.log').replace('\\', '/')

os.makedirs(PROJECTS_DIR, exist_ok=True)
os.makedirs(THUMB_CACHE, exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)

logger = logging.getLogger("API")
