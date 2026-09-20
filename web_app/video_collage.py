import os
import re
import json
import logging
import subprocess
import urllib.request
from typing import Dict, Any, Optional, List

import database
import ai_assistant
from core.ai_models import get_active_text_model, get_model_cascade

logger = logging.getLogger(__name__)

def clean_json_text(raw_text: str) -> str:
    cleaned = raw_text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = re.sub(r',\s*([\]}])', r'\1', cleaned.strip())
    return cleaned.strip()

def create_badge_image(
    text: str,
    bg_color=(15, 23, 42, 220),
    border_color=(56, 189, 248, 255),
    output_png: str = ""
) -> str:
    """Creates a sleek modern pill badge with transparent background using Pillow."""
    from PIL import Image, ImageDraw, ImageFont
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 26)
    except Exception:
        font = ImageFont.load_default()

    dummy_img = Image.new("RGBA", (10, 10))
    dummy_draw = ImageDraw.Draw(dummy_img)
    bbox = dummy_draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]

    padding_x = 24
    padding_y = 12
    width = tw + (padding_x * 2)
    height = th + (padding_y * 2)

    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([0, 0, width - 1, height - 1], radius=12, fill=bg_color, outline=border_color, width=2)
    draw.text((padding_x, padding_y - 2), text, font=font, fill=(255, 255, 255, 255))
    img.save(output_png, "PNG")
    return output_png

def build_split_screen_video(
    video_top: str,
    video_bottom: str,
    output_path: str,
    layout: str = "vertical_stack",  # "vertical_stack" (9:16 Shorts) or "horizontal_stack" (16:9 Full)
    crop_sides_pct: float = 10.0,
    top_offset_sec: float = 0.0,
    bottom_offset_sec: float = 0.0,
    duration: Optional[float] = None,
    audio_mode: str = "mix",          # "mix", "top", "bottom"
    top_label: Optional[str] = None,
    bottom_label: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Builds a professional split-screen collage from 2 videos using FFmpeg.
    - layout="vertical_stack": Stacks video_top (1080x960) over video_bottom (1080x960) => 1080x1920 (9:16).
    - layout="horizontal_stack": Puts video_top (960x1080) next to video_bottom (960x1080) => 1920x1080 (16:9).
    - crop_sides_pct: crops e.g. 10% from left and 10% from right before scaling to preserve aspect ratio.
    - audio_mode: 'mix' (combines both), 'top' (only top audio), 'bottom' (only bottom audio).
    - top_label / bottom_label: dynamic stylish badges with PIL overlay.
    """
    if not os.path.exists(video_top):
        raise FileNotFoundError(f"Файл верхнього відео не знайдено: {video_top}")
    if not os.path.exists(video_bottom):
        raise FileNotFoundError(f"Файл нижнього відео не знайдено: {video_bottom}")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    cache_dir = os.path.join(os.path.dirname(output_path), ".cache_badges")
    os.makedirs(cache_dir, exist_ok=True)

    # Crop parameters: crop away crop_sides_pct from left and right
    crop_w_ratio = max(0.2, min(1.0, 1.0 - (2 * crop_sides_pct / 100.0)))
    crop_x_offset = crop_sides_pct / 100.0

    inputs_args = []
    if top_offset_sec > 0:
        inputs_args.extend(["-ss", str(top_offset_sec)])
    inputs_args.extend(["-i", video_top])

    if bottom_offset_sec > 0:
        inputs_args.extend(["-ss", str(bottom_offset_sec)])
    inputs_args.extend(["-i", video_bottom])

    input_count = 2
    top_badge_idx = None
    bot_badge_idx = None

    if top_label:
        top_badge_file = os.path.join(cache_dir, f"badge_top_{abs(hash(top_label))}.png")
        create_badge_image(
            text=top_label,
            bg_color=(15, 23, 42, 225),
            border_color=(56, 189, 248, 255),
            output_png=top_badge_file
        )
        inputs_args.extend(["-i", top_badge_file])
        top_badge_idx = input_count
        input_count += 1

    if bottom_label:
        bot_badge_file = os.path.join(cache_dir, f"badge_bot_{abs(hash(bottom_label))}.png")
        create_badge_image(
            text=bottom_label,
            bg_color=(15, 23, 42, 225),
            border_color=(251, 146, 60, 255),
            output_png=bot_badge_file
        )
        inputs_args.extend(["-i", bot_badge_file])
        bot_badge_idx = input_count
        input_count += 1

    filter_complex_parts = []

    if layout == "vertical_stack":
        # Target: 1080x1920. Top: 1080x960. Bottom: 1080x960.
        filter_complex_parts.append(
            f"[0:v]crop=iw*{crop_w_ratio:.3f}:ih:iw*{crop_x_offset:.3f}:0,"
            f"scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960[top_raw]"
        )
        filter_complex_parts.append(
            f"[1:v]crop=iw*{crop_w_ratio:.3f}:ih:iw*{crop_x_offset:.3f}:0,"
            f"scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960[bottom_raw]"
        )

        filter_complex_parts.append("[top_raw][bottom_raw]vstack=inputs=2[stacked]")
        filter_complex_parts.append(
            "[stacked]drawbox=x=0:y=956:w=1080:h=8:color=black:t=fill[vbase]"
        )

        last_stream = "[vbase]"
        if top_badge_idx is not None:
            filter_complex_parts.append(f"{last_stream}[{top_badge_idx}:v]overlay=40:40[v_top_b]")
            last_stream = "[v_top_b]"
        if bot_badge_idx is not None:
            filter_complex_parts.append(f"{last_stream}[{bot_badge_idx}:v]overlay=40:1000[v_bot_b]")
            last_stream = "[v_bot_b]"

        filter_complex_parts.append(f"{last_stream}null[vout]")

    else:
        # Target: 1920x1080 (16:9). Left: 960x1080. Right: 960x1080.
        filter_complex_parts.append(
            f"[0:v]crop=iw*{crop_w_ratio:.3f}:ih:iw*{crop_x_offset:.3f}:0,"
            f"scale=960:1080:force_original_aspect_ratio=increase,crop=960:1080[left_raw]"
        )
        filter_complex_parts.append(
            f"[1:v]crop=iw*{crop_w_ratio:.3f}:ih:iw*{crop_x_offset:.3f}:0,"
            f"scale=960:1080:force_original_aspect_ratio=increase,crop=960:1080[right_raw]"
        )
        filter_complex_parts.append("[left_raw][right_raw]hstack=inputs=2[stacked]")
        filter_complex_parts.append(
            "[stacked]drawbox=x=956:y=0:w=8:h=1080:color=black:t=fill[vbase]"
        )

        last_stream = "[vbase]"
        if top_badge_idx is not None:
            filter_complex_parts.append(f"{last_stream}[{top_badge_idx}:v]overlay=40:40[v_top_b]")
            last_stream = "[v_top_b]"
        if bot_badge_idx is not None:
            filter_complex_parts.append(f"{last_stream}[{bot_badge_idx}:v]overlay=1000:40[v_bot_b]")
            last_stream = "[v_bot_b]"

        filter_complex_parts.append(f"{last_stream}null[vout]")

    # Audio handling
    audio_map = []
    if audio_mode == "top":
        audio_map = ["-map", "0:a:0?"]
    elif audio_mode == "bottom":
        audio_map = ["-map", "1:a:0?"]
    else:  # "mix"
        filter_complex_parts.append("[0:a:0]volume=0.85[a0]; [1:a:0]volume=1.0[a1]; [a0][a1]amix=inputs=2:duration=first:dropout_transition=2[aout]")
        audio_map = ["-map", "[aout]"]

    full_filter = ";".join(filter_complex_parts)

    cmd = ["ffmpeg", "-y"] + inputs_args + [
        "-filter_complex", full_filter,
        "-map", "[vout]"
    ] + audio_map

    if duration and duration > 0:
        cmd.extend(["-t", str(duration)])

    cmd.extend([
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "20",
        "-c:a", "aac",
        "-b:a", "192k",
        output_path
    ])

    logger.info(f"Executing split-screen render: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        logger.error(f"FFmpeg split screen error: {result.stderr[-500:]}")
        raise RuntimeError(f"Помилка створення спліт-скрін відео: {result.stderr[-300:]}")

    # Register in SQLite database
    norm_path = output_path.replace('\\', '/')
    is_shorts = (layout == "vertical_stack")
    base_title = os.path.splitext(os.path.basename(output_path))[0]
    
    database.upsert_record(
        path=norm_path,
        filename=os.path.basename(output_path),
        title=f"{base_title} {'#Shorts' if is_shorts else ''}".strip(),
        description="Спліт-скрін відеопорівняння.",
        tags=["Comparison", "Highlights", "Shorts" if is_shorts else "Video"],
        is_shorts=is_shorts,
        status="planning"
    )

    logger.info(f"Successfully generated split-screen video: {output_path}")
    return {
        "success": True,
        "path": norm_path,
        "output_path": norm_path,
        "filename": os.path.basename(output_path),
        "is_shorts": is_shorts
    }


def generate_long_video_package(
    video_title_hint: str,
    game_or_devices: str,
    key_points: Optional[str] = None,
    language: str = "uk"
) -> Dict[str, Any]:
    """
    Generates a full, comprehensive YouTube publishing package for a 2-3 minute video:
    - High-CTR title
    - Detailed structured Markdown description with timestamps, device specs, comparison highlights, call-to-action
    - 25-35 SEO tags
    - Pinned comment discussion question
    """
    api_key = ai_assistant.get_api_key()
    if not api_key:
        raise RuntimeError("Gemini API ключ не налаштовано.")

    is_en = language.lower().startswith("en")
    lang_name = "English" if is_en else "Ukrainian"

    prompt = f"""You are a master YouTube Producer specializing in gaming hardware and comparison reviews.
The creator is producing a high-impact 2 to 3 minute YouTube video comparing:
TOPIC: '{video_title_hint}'
DEVICES / CONTEXT: '{game_or_devices}'
ADDITIONAL NOTES: '{key_points or 'Hands-on hardware vs emulator gameplay, graphics, physics, and FPS comparison.'}'

LANGUAGE: {lang_name}

Generate an elite YouTube Publishing Package in strict JSON:
{{
  "title": "High CTR clickable title under 70 characters with emoji",
  "description": "Comprehensive markdown description including:\\n⚡ Hook & Concept\\n🎮 What We Compare\\n⏱️ Exact Timestamps (0:00 Intro, 0:40 Graphics, 1:20 Physics & Destruction, 2:05 Performance & FPS, 2:45 Final Verdict)\\n💻 Hardware & Software Specs\\n💬 Question of the day for comments\\n🔔 Subscribe reminder\\n🏷️ 4-5 relevant hashtags",
  "tags": ["25 to 35 search tags without '#'"],
  "pinned_comment": "Engaging question for the pinned comment to drive viewer comments",
  "thumbnail_direction": "Visual description of the perfect 16:9 thumbnail concept (split screen comparison, contrasting lighting, expressive text)"
}}
"""

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "response_mime_type": "application/json",
            "temperature": 0.4
        }
    }

    last_error = "Gemini API unavailable"
    for model in get_model_cascade(get_active_text_model()):
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode('utf-8'),
                headers={'Content-Type': 'application/json'}
            )
            resp = urllib.request.urlopen(req, timeout=30)
            if resp.status == 200:
                data = json.loads(resp.read().decode('utf-8'))
                raw_text = data['candidates'][0]['content']['parts'][0]['text']
                cleaned = clean_json_text(raw_text)
                parsed = json.loads(cleaned)
                return parsed
        except Exception as e:
            last_error = str(e)
            continue

    raise RuntimeError(f"Помилка генерації опису для повноформатного відео: {last_error}")
