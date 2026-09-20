import os
import time
import subprocess
import json
import logging
from typing import Dict, Any, Optional
from PIL import Image, ImageDraw, ImageFont

logger = logging.getLogger("VideoOutro")

OUTRO_STYLES = {
    "youtube_classic": {
        "name": "YouTube Red Stamp",
        "lines": ["LIKE", "SUBSCRIBE"],
        "accent_color": (255, 35, 35, 255),    # Vibrant YouTube Red
        "text_color": (255, 255, 255, 255),    # Crisp White
        "border_width": 7,
        "lang": "en",
    },
    "ukrainian_native": {
        "name": "UA Gold Stamp",
        "lines": ["ЛАЙК", "ПІДПИСКА"],
        "accent_color": (255, 215, 0, 255),    # Warm UA Gold
        "text_color": (255, 255, 255, 255),    # Crisp White
        "border_width": 7,
        "lang": "uk",
    },
    "ukrainian_red": {
        "name": "UA Red Stamp",
        "lines": ["ЛАЙК", "ПІДПИСКА"],
        "accent_color": (255, 35, 35, 255),    # Vibrant YouTube Red
        "text_color": (255, 255, 255, 255),    # Crisp White
        "border_width": 7,
        "lang": "uk",
    },
    "hype_gaming": {
        "name": "Neon Cyan Stamp",
        "lines": ["LIKE", "SUBSCRIBE"],
        "accent_color": (0, 240, 255, 255),    # Electric Cyan
        "text_color": (255, 255, 255, 255),    # Crisp White
        "border_width": 7,
        "lang": "en",
    },
    "minimal_dark": {
        "name": "Minimalist White Stamp",
        "lines": ["LIKE", "SUBSCRIBE"],
        "accent_color": (255, 255, 255, 255),  # Pure White
        "text_color": (255, 255, 255, 255),    # Pure White
        "border_width": 7,
        "lang": "en",
    },
    "minimal_dark_ua": {
        "name": "UA Minimalist White",
        "lines": ["ЛАЙК", "ПІДПИСКА"],
        "accent_color": (255, 255, 255, 255),  # Pure White
        "text_color": (255, 255, 255, 255),    # Pure White
        "border_width": 7,
        "lang": "uk",
    }
}

def get_font(size: int, bold: bool = True):
    font_names = [
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/tahomabd.ttf" if bold else "C:/Windows/Fonts/tahoma.ttf",
    ]
    for fn in font_names:
        if os.path.exists(fn):
            try:
                return ImageFont.truetype(fn, size)
            except Exception:
                pass
    return ImageFont.load_default()

def create_outro_card_image(
    style_key: str = "youtube_classic",
    width: int = 900,
    height: int = 360,
    output_png: str = "outro_card.png"
) -> str:
    """
    Renders an ultra-sharp, pure minimalist stamp CTA:
    - Double border stamp frame (outer thick + inner fine border)
    - Large bold uppercase typography (LIKE / SUBSCRIBE or ЛАЙК / ПІДПИСКА)
    - Zero clutter, zero fake buttons, zero emoji stickers
    """
    style = OUTRO_STYLES.get(style_key, OUTRO_STYLES["youtube_classic"])
    
    scale = 2
    sw, sh = width * scale, height * scale
    
    img = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    font_size = 98 * scale
    font = get_font(font_size, bold=True)
    
    # Outer box bounds
    mx, my = 20 * scale, 18 * scale
    box = [mx, my, sw - mx, sh - my]
    r = 16 * scale
    
    # Outer bold stamp border
    outer_w = style.get("border_width", 7) * scale
    draw.rounded_rectangle(box, radius=r, outline=style["accent_color"], width=outer_w)
    
    # Inner fine stamp border (authentic double-stamp seal)
    gap = 10 * scale
    inner_box = [box[0] + gap, box[1] + gap, box[2] - gap, box[3] - gap]
    draw.rounded_rectangle(inner_box, radius=max(4, r - gap), outline=style["accent_color"], width=3 * scale)
    
    # Calculate text positioning
    lines = style.get("lines", ["LIKE", "SUBSCRIBE"])
    bboxes = [draw.textbbox((0, 0), l, font=font) for l in lines]
    heights = [b[3] - b[1] for b in bboxes]
    spacing = 24 * scale
    total_h = sum(heights) + (spacing if len(lines) > 1 else 0)
    
    cur_y = (sh - total_h) // 2
    for i, line in enumerate(lines):
        bbox = bboxes[i]
        lw = bbox[2] - bbox[0]
        lx = (sw - lw) // 2
        draw.text((lx, cur_y - bbox[1]), line, font=font, fill=style["text_color"])
        cur_y += heights[i] + spacing
        
    final_img = img.resize((width, height), Image.Resampling.LANCZOS)
    os.makedirs(os.path.dirname(os.path.abspath(output_png)), exist_ok=True)
    final_img.save(output_png, "PNG")
    logger.info(f"Generated stamp outro image: {output_png} ({width}x{height})")
    return output_png


def get_video_info(video_path: str) -> Dict[str, Any]:
    """Extracts width, height, duration, and audio stream presence using ffprobe."""
    cmd = [
        "ffprobe", "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height,duration",
        "-show_entries", "format=duration",
        "-of", "json",
        video_path
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"FFprobe error: {res.stderr}")
    data = json.loads(res.stdout)
    stream = data.get("streams", [{}])[0]
    
    w = int(stream.get("width", 1080))
    h = int(stream.get("height", 1920))
    duration = float(stream.get("duration") or data.get("format", {}).get("duration") or 0.0)

    # Check for audio stream
    has_audio = False
    try:
        cmd_a = [
            "ffprobe", "-v", "error",
            "-select_streams", "a:0",
            "-show_entries", "stream=index",
            "-of", "csv=p=0",
            video_path
        ]
        res_a = subprocess.run(cmd_a, capture_output=True, text=True, timeout=5)
        has_audio = bool(res_a.stdout.strip())
    except Exception:
        has_audio = True

    return {"width": w, "height": h, "duration": duration, "has_audio": has_audio}


def apply_outro_overlay(
    source_video: str,
    output_video: Optional[str] = None,
    style_key: str = "youtube_classic",
    bg_mode: str = "deep_black",          # "deep_black" (1.0 pitch black) or "cinematic_dark" (0.78 dim)
    outro_duration: float = 2.8,
    lang: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Applies the smooth dimming / black screen & stylized Like & Subscribe CTA card to the last `outro_duration` seconds of the video.
    Does NOT extend the total duration (maintains strict Shorts compatibility).
    Automatically adapts language if specified (e.g. 'uk' -> Ukrainian Stamp, 'en' -> English Stamp).
    Handles both videos with and without audio tracks seamlessly.
    """
    if not os.path.exists(source_video):
        raise FileNotFoundError(f"Відео не знайдено: {source_video}")

    # Auto language resolution if requested
    if lang:
        l_code = lang.lower()
        if l_code.startswith("uk"):
            if style_key in ["youtube_classic", "auto", "default"]:
                style_key = "ukrainian_native"
            elif style_key == "minimal_dark":
                style_key = "minimal_dark_ua"
        elif l_code.startswith("en"):
            if style_key in ["ukrainian_native", "ukrainian_red", "auto", "default"]:
                style_key = "youtube_classic"
            elif style_key == "minimal_dark_ua":
                style_key = "minimal_dark"

    info = get_video_info(source_video)
    vw, vh, total_dur, has_audio = info["width"], info["height"], info["duration"], info.get("has_audio", True)
    
    if total_dur <= 2.0:
        raise ValueError("Відео занадто коротке для накладання аутро (менше 2 секунд).")

    # Ensure outro fits within video
    actual_outro_dur = min(outro_duration, max(1.5, total_dur * 0.35))
    start_t = max(0.0, total_dur - actual_outro_dur)
    card_fade_start = start_t + 0.35
    fade_dur = 0.45
    dim_opacity = 1.0 if bg_mode == "deep_black" else 0.78

    source_dir = os.path.dirname(os.path.abspath(source_video))
    base_name = os.path.splitext(os.path.basename(source_video))[0]
    
    is_same_file = False
    temp_final = None
    if not output_video:
        output_video = os.path.join(source_dir, f"{base_name} (Outro).mp4")
    elif os.path.abspath(source_video).lower() == os.path.abspath(output_video).lower():
        is_same_file = True
        temp_final = output_video
        output_video = os.path.join(source_dir, f".temp_outro_{int(time.time()*1000)}.mp4")

    # Determine stamp size based on aspect ratio
    is_vertical = vh > vw
    if is_vertical:
        card_w = min(int(vw * 0.86), 900)
        card_h = int(card_w * 0.40)
        card_y = "(H-h)/2"  # Exact center for 9:16 Shorts
    else:
        card_w = min(int(vw * 0.52), 900)
        card_h = int(card_w * 0.40)
        card_y = "(H-h)/2"  # Exact center for 16:9 widescreen

    # Generate CTA Card PNG
    cache_dir = os.path.join(source_dir, ".cache_outro")
    os.makedirs(cache_dir, exist_ok=True)
    card_png = os.path.join(cache_dir, f"card_{style_key}_{card_w}x{card_h}.png")
    create_outro_card_image(style_key=style_key, width=card_w, height=card_h, output_png=card_png)

    # Filter complex:
    # 1. Darken / fade to black starting at start_t
    # 2. Overlay CTA card with smooth fade in at card_fade_start
    if has_audio:
        filter_complex = (
            f"color=c=black@{dim_opacity}:s={vw}x{vh}:d={actual_outro_dur},format=rgba,fade=t=in:st=0:d={fade_dur}:alpha=1[dim_box];"
            f"[0:v][dim_box]overlay=0:0:enable='gte(t,{start_t:.2f})'[v_dimmed];"
            f"[1:v]format=rgba,fade=t=in:st=0:d={fade_dur}:alpha=1[cta_in];"
            f"[v_dimmed][cta_in]overlay=(W-w)/2:{card_y}:enable='gte(t,{card_fade_start:.2f})'[vout];"
            f"[0:a]volume=1.0[aout]"
        )

        cmd = [
            "ffmpeg", "-y",
            "-i", source_video,
            "-loop", "1", "-t", str(actual_outro_dur), "-i", card_png,
            "-filter_complex", filter_complex,
            "-map", "[vout]",
            "-map", "[aout]",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "20",
            "-c:a", "aac",
            "-b:a", "192k",
            "-shortest",
            output_video
        ]
    else:
        filter_complex = (
            f"color=c=black@{dim_opacity}:s={vw}x{vh}:d={actual_outro_dur},format=rgba,fade=t=in:st=0:d={fade_dur}:alpha=1[dim_box];"
            f"[0:v][dim_box]overlay=0:0:enable='gte(t,{start_t:.2f})'[v_dimmed];"
            f"[1:v]format=rgba,fade=t=in:st=0:d={fade_dur}:alpha=1[cta_in];"
            f"[v_dimmed][cta_in]overlay=(W-w)/2:{card_y}:enable='gte(t,{card_fade_start:.2f})'[vout]"
        )

        cmd = [
            "ffmpeg", "-y",
            "-i", source_video,
            "-loop", "1", "-t", str(actual_outro_dur), "-i", card_png,
            "-filter_complex", filter_complex,
            "-map", "[vout]",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "20",
            "-shortest",
            output_video
        ]

    logger.info(f"Running outro overlay render: {' '.join(cmd)}")
    t0 = time.time()
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        logger.error(f"FFmpeg outro error: {res.stderr[-400:]}")
        raise RuntimeError(f"Помилка створення аутро: {res.stderr[-250:]}")

    if is_same_file and temp_final:
        if os.path.exists(temp_final):
            try:
                os.remove(temp_final)
            except Exception:
                pass
        os.replace(output_video, temp_final)
        output_video = temp_final

    elapsed = time.time() - t0
    logger.info(f"Outro rendered in {elapsed:.2f}s: {output_video}")
    return {
        "success": True,
        "path": output_video.replace('\\', '/'),
        "filename": os.path.basename(output_video),
        "style": style_key,
        "bg_mode": bg_mode,
        "width": vw,
        "height": vh,
        "outro_duration": actual_outro_dur,
        "render_time_sec": round(elapsed, 2)
    }
