import os
import re
import json
import subprocess
import logging

logger = logging.getLogger("VideoHelpers")

def get_video_metadata(file_path: str):
    """Inspects video format using ffprobe to accurately detect YouTube Shorts vs Regular Video."""
    cmd = [
        'ffprobe', '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height,duration',
        '-show_entries', 'format=duration',
        '-of', 'json',
        file_path
    ]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True)
        data = json.loads(res.stdout)
        stream = data.get('streams', [{}])[0]
        width = int(stream.get('width', 1920))
        height = int(stream.get('height', 1080))
        
        duration = 0.0
        if stream.get('duration'):
            duration = float(stream['duration'])
        elif data.get('format', {}).get('duration'):
            duration = float(data['format']['duration'])
            
        is_shorts = (height >= width) and (0 < duration <= 180)
        aspect_ratio = "9:16" if height > width else ("1:1" if height == width else "16:9")
        
        mins = int(duration // 60)
        secs = int(duration % 60)
        duration_formatted = f"{mins}:{secs:02d}"
        
        return {
            "width": width,
            "height": height,
            "duration": round(duration, 1),
            "duration_formatted": duration_formatted,
            "is_shorts": is_shorts,
            "aspect_ratio": aspect_ratio
        }
    except Exception as e:
        logger.warning(f"ffprobe error on {file_path}: {e}")
        return {
            "width": 1920,
            "height": 1080,
            "duration": 0.0,
            "duration_formatted": "0:00",
            "is_shorts": False,
            "aspect_ratio": "16:9"
        }

def parse_description_file(folder_path: str):
    desc_path = os.path.join(folder_path, "description.md")
    if not os.path.exists(desc_path):
        return {"title_options": [], "description": "", "tags": []}
    
    try:
        with open(desc_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        title_options = []
        titles_block = re.search(r'(?i)###?\s*Назва.*?\n(.*?)(?=\n###?|\Z)', content, re.DOTALL)
        if titles_block:
            for line in titles_block.group(1).split('\n'):
                line = re.sub(r'^\s*[-*•\d\.]+\s*', '', line).strip()
                if line and len(line) > 3:
                    title_options.append(line)
                    
        desc_block = re.search(r'(?i)###?\s*Опис.*?\n(.*?)(?=\n###?|\Z)', content, re.DOTALL)
        description = desc_block.group(1).strip() if desc_block else ""
        
        tags = []
        tags_block = re.search(r'(?i)###?\s*Теги.*?\n(.*?)(?=\n###?|\Z)', content, re.DOTALL)
        if tags_block:
            for t in re.split(r'[,#\n]+', tags_block.group(1)):
                clean_t = t.strip()
                if clean_t and clean_t not in tags:
                    tags.append(clean_t)
                    
        return {
            "title_options": title_options,
            "description": description,
            "tags": tags
        }
    except Exception as e:
        logger.error(f"Error parsing description.md in {folder_path}: {e}")
        return {"title_options": [], "description": "", "tags": []}
