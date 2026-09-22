import os
import time
import math
import subprocess
import json
import logging
from typing import Dict, Any, Optional
from PIL import Image, ImageDraw, ImageFont

logger = logging.getLogger("VideoOutro")

OUTRO_STYLES = {
    "youtube_animated_pills": {
        "name": "Жива анімація (YouTube Like & Subscribe)",
        "lines": ["LIKE", "SUBSCRIBE"],
        "accent_color": (255, 35, 35, 255),    # YouTube Red
        "text_color": (255, 255, 255, 255),    # Crisp White
        "border_width": 0,
        "is_animated": True,
        "lang": "all",
    },
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

def ease_out_back(t: float, c1: float = 1.35) -> float:
    """Smooth bouncy ease-out curve."""
    t = max(0.0, min(1.0, t))
    c3 = c1 + 1.0
    return 1.0 + c3 * ((t - 1.0) ** 3) + c1 * ((t - 1.0) ** 2)

def draw_thumbs_up(draw: ImageDraw.ImageDraw, x: int, y: int, size: int, color=(15, 15, 15, 255)):
    """Draws a clean, iconic thumbs-up hand icon."""
    scale = size / 40.0
    thumb = [
        (x + 10 * scale, y + 16 * scale),
        (x + 12 * scale, y + 4 * scale),
        (x + 17 * scale, y + 2 * scale),
        (x + 20 * scale, y + 5 * scale),
        (x + 18 * scale, y + 15 * scale),
    ]
    draw.polygon(thumb, fill=color)
    draw.ellipse([x + 11 * scale, y + 1 * scale, x + 20 * scale, y + 10 * scale], fill=color)
    draw.rounded_rectangle([x + 8 * scale, y + 14 * scale, x + 34 * scale, y + 36 * scale], radius=int(6 * scale), fill=color)
    draw.rounded_rectangle([x + 1 * scale, y + 17 * scale, x + 7 * scale, y + 35 * scale], radius=int(2 * scale), fill=color)

def draw_play_icon(draw: ImageDraw.ImageDraw, x: int, y: int, size: int, color=(255, 255, 255, 255)):
    """Draws YouTube play triangle."""
    scale = size / 40.0
    pts = [
        (x + 10 * scale, y + 6 * scale),
        (x + 32 * scale, y + 20 * scale),
        (x + 10 * scale, y + 34 * scale),
    ]
    draw.polygon(pts, fill=color)

def generate_animated_cta(
    output_apng: str,
    output_gif: str,
    lang: str = "en",
    width: int = 760,
    height: int = 140,
    fps: int = 20,
    duration_sec: float = 2.6
):
    """
    Renders staggered motion CTA:
    1. Empty pills pop in with bouncy ease-out
    2. Icons & text appear in exact geometric center of each pill
    3. Seamless floating & pulsing loop throughout
    """
    total_frames = int(fps * duration_sec)
    frames_rgba = []
    
    is_uk = lang.lower().startswith("uk")
    like_text = "ЛАЙК" if is_uk else "LIKE"
    sub_text = "ПІДПИСАТИСЯ" if is_uk else "SUBSCRIBE"
    
    scale = 2
    sw, sh = width * scale, height * scale
    font_btn = get_font(32 * scale, bold=True)
    
    # Pill dimensions (1x base):
    like_w = 210 if is_uk else 190
    sub_w = 370 if is_uk else 310
    base_h = 74
    gap = 20
    
    s_like_w = like_w * scale
    s_sub_w = sub_w * scale
    s_base_h = base_h * scale
    s_gap = gap * scale
    s_total_w = s_like_w + s_gap + s_sub_w
    
    # Exact text metrics
    dummy = Image.new("RGBA", (10, 10))
    d_draw = ImageDraw.Draw(dummy)
    l_bbox = d_draw.textbbox((0, 0), like_text, font=font_btn)
    l_tw, l_th = l_bbox[2] - l_bbox[0], l_bbox[3] - l_bbox[1]
    
    s_bbox = d_draw.textbbox((0, 0), sub_text, font=font_btn)
    s_tw, s_th = s_bbox[2] - s_bbox[0], s_bbox[3] - s_bbox[1]
    
    icon_l_size = 34 * scale
    icon_s_size = 30 * scale
    gap_icon_text = 12 * scale
    
    for i in range(total_frames):
        img = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        
        # Phases:
        # 0..10: Pills pop in (empty)
        # 11..19: Text & icons pop in (centered)
        # 20..end: Floating & pulsing loop
        if i <= 10:
            t_p = i / 10.0
            pill_scale = ease_out_back(t_p, c1=1.3)
            pill_alpha = min(1.0, t_p * 1.5)
            content_alpha = 0.0
            float_y = 0
            sub_pulse = 1.0
        elif i <= 19:
            pill_scale = 1.0
            pill_alpha = 1.0
            t_c = (i - 10) / 9.0
            content_alpha = min(1.0, t_c * 1.4)
            float_y = 0
            sub_pulse = 1.0
        else:
            t_loop = (i - 20) / float(total_frames - 20)
            sin_val = math.sin(2 * math.pi * t_loop)
            float_y = int(4 * scale * sin_val)
            pill_scale = 1.0
            pill_alpha = 1.0
            content_alpha = 1.0
            sub_pulse = 1.0 + 0.035 * (0.5 + 0.5 * sin_val)
            
        center_x = sw // 2
        center_y = sh // 2 + float_y
        start_x = center_x - s_total_w // 2
        
        ca_byte = int(content_alpha * 255)
        shadow_a = int(60 * pill_alpha)
        white_bg = (255, 255, 255, int(250 * pill_alpha))
        white_border = (220, 220, 220, int(220 * pill_alpha))
        red_bg = (245, 12, 12, int(255 * pill_alpha))
        red_border = (210, 0, 0, int(255 * pill_alpha))
        
        # 1. LIKE PILL (White)
        lw = int(s_like_w * pill_scale)
        lh = int(s_base_h * pill_scale)
        if lw > 2 and lh > 2:
            lx_center = start_x + s_like_w // 2
            lx1 = lx_center - lw // 2
            ly1 = center_y - lh // 2
            lx2 = lx1 + lw
            ly2 = ly1 + lh
            rad_l = lh // 2
            
            draw.rounded_rectangle([lx1, ly1 + 6 * scale, lx2, ly2 + 6 * scale], radius=rad_l, fill=(0, 0, 0, shadow_a))
            draw.rounded_rectangle([lx1, ly1, lx2, ly2], radius=rad_l, fill=white_bg, outline=white_border, width=2 * scale)
            
            # Content strictly centered
            if content_alpha > 0.01:
                content_w = icon_l_size + gap_icon_text + l_tw
                margin_x = (s_like_w - content_w) // 2
                icon_x = start_x + margin_x
                icon_y = center_y - icon_l_size // 2
                text_x = icon_x + icon_l_size + gap_icon_text
                text_y = center_y - l_th // 2 - l_bbox[1]
                
                text_color = (20, 20, 20, ca_byte)
                draw_thumbs_up(draw, icon_x, icon_y, icon_l_size, color=text_color)
                draw.text((text_x, text_y), like_text, font=font_btn, fill=text_color)
                
        # 2. SUBSCRIBE PILL (YouTube Red)
        rw = int(s_sub_w * pill_scale * (sub_pulse if pill_scale >= 1.0 else 1.0))
        rh = int(s_base_h * pill_scale * (sub_pulse if pill_scale >= 1.0 else 1.0))
        if rw > 2 and rh > 2:
            rx_center = start_x + s_like_w + s_gap + s_sub_w // 2
            rx1 = rx_center - rw // 2
            ry1 = center_y - rh // 2
            rx2 = rx1 + rw
            ry2 = ry1 + rh
            rad_r = rh // 2
            
            draw.rounded_rectangle([rx1, ry1 + 6 * scale, rx2, ry2 + 6 * scale], radius=rad_r, fill=(0, 0, 0, shadow_a))
            draw.rounded_rectangle([rx1, ry1, rx2, ry2], radius=rad_r, fill=red_bg, outline=red_border, width=2 * scale)
            
            # Content strictly centered
            if content_alpha > 0.01:
                content_w = icon_s_size + gap_icon_text + s_tw
                margin_x = (s_sub_w - content_w) // 2
                sub_start_x = start_x + s_like_w + s_gap
                s_icon_x = sub_start_x + margin_x
                s_icon_y = center_y - icon_s_size // 2
                s_text_x = s_icon_x + icon_s_size + gap_icon_text
                s_text_y = center_y - s_th // 2 - s_bbox[1]
                
                red_text_color = (255, 255, 255, ca_byte)
                draw_play_icon(draw, s_icon_x, s_icon_y, icon_s_size, color=red_text_color)
                draw.text((s_text_x, s_text_y), sub_text, font=font_btn, fill=red_text_color)
                
        frame_res = img.resize((width, height), Image.Resampling.LANCZOS)
        frames_rgba.append(frame_res)
        
    os.makedirs(os.path.dirname(os.path.abspath(output_apng)), exist_ok=True)
    frame_duration_ms = int(1000 / fps)
    
    # 32-bit APNG
    frames_rgba[0].save(
        output_apng,
        save_all=True,
        append_images=frames_rgba[1:],
        duration=frame_duration_ms,
        loop=0
    )
    
    # GIF with adaptive palette
    gif_frames = []
    for fr in frames_rgba:
        alpha = fr.split()[3]
        p_frame = fr.convert('RGB').convert('P', palette=Image.ADAPTIVE, colors=255)
        mask = Image.eval(alpha, lambda a: 255 if a < 128 else 0)
        p_frame.paste(255, mask)
        p_frame.info['transparency'] = 255
        gif_frames.append(p_frame)
        
    gif_frames[0].save(
        output_gif,
        save_all=True,
        append_images=gif_frames[1:],
        duration=frame_duration_ms,
        loop=0,
        transparency=255,
        disposal=2
    )

def ensure_animated_cta_assets(lang: str = "en") -> Dict[str, str]:
    """Ensures that APNG & GIF CTA assets are generated and cached in static/cta/."""
    is_uk = lang.lower().startswith("uk")
    code = "uk" if is_uk else "en"
    base_dir = os.path.dirname(os.path.abspath(__file__))
    cta_dir = os.path.join(base_dir, "static", "cta")
    os.makedirs(cta_dir, exist_ok=True)
    
    apng_path = os.path.join(cta_dir, f"youtube_cta_{code}.png")
    gif_path = os.path.join(cta_dir, f"youtube_cta_{code}.gif")
    
    # Re-generate if missing or outdated
    if not (os.path.exists(apng_path) and os.path.getsize(apng_path) > 1000 and os.path.exists(gif_path)):
        logger.info(f"Generating animated CTA assets for lang={code}...")
        generate_animated_cta(apng_path, gif_path, lang=code)
    
    return {"apng": apng_path.replace("\\", "/"), "gif": gif_path.replace("\\", "/")}

def create_outro_card_image(
    style_key: str = "youtube_classic",
    width: int = 900,
    height: int = 360,
    output_png: str = "outro_card.png"
) -> str:
    """Renders a stamp CTA card image for outro card mode."""
    style = OUTRO_STYLES.get(style_key, OUTRO_STYLES["youtube_classic"])
    
    scale = 2
    sw, sh = width * scale, height * scale
    
    img = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    font_size = 98 * scale
    font = get_font(font_size, bold=True)
    
    mx, my = 20 * scale, 18 * scale
    box = [mx, my, sw - mx, sh - my]
    r = 16 * scale
    
    outer_w = style.get("border_width", 7) * scale
    draw.rounded_rectangle(box, radius=r, outline=style["accent_color"], width=outer_w)
    
    gap = 10 * scale
    inner_box = [box[0] + gap, box[1] + gap, box[2] - gap, box[3] - gap]
    draw.rounded_rectangle(inner_box, radius=max(4, r - gap), outline=style["accent_color"], width=3 * scale)
    
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
    style_key: str = "youtube_animated_pills",
    mode: str = "bottom_floating",        # "bottom_floating" (throughout whole video) or "outro_card" (end card)
    bg_mode: str = "deep_black",          # "deep_black" or "cinematic_dark"
    outro_duration: float = 2.8,
    lang: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Applies the stylized Like & Subscribe CTA:
    - Mode "bottom_floating" (Default): Overlays animated YouTube buttons at the bottom of Shorts
      in the lowered safe zone (H-h-200) throughout the video with smooth staggered pop-in, keeping audio intact.
    - Mode "outro_card": Overlays stamp card during the last `outro_duration` seconds.
    """
    if not os.path.exists(source_video):
        raise FileNotFoundError(f"Відео не знайдено: {source_video}")

    lang_code = "en"
    if lang and lang.lower().startswith("uk"):
        lang_code = "uk"

    # Legacy stamp cards and black-screen outros are obsolete:
    # ALWAYS use the new animated YouTube Like & Subscribe sticker in the safe zone!
    style_key = "youtube_animated_pills"
    mode = "bottom_floating"

    info = get_video_info(source_video)
    vw, vh, total_dur, has_audio = info["width"], info["height"], info["duration"], info.get("has_audio", True)
    
    if total_dur <= 1.0:
        raise ValueError("Відео занадто коротке для накладання CTA (менше 1 секунди).")

    source_dir = os.path.dirname(os.path.abspath(source_video))
    base_name = os.path.splitext(os.path.basename(source_video))[0]
    
    is_same_file = False
    temp_final = None
    if not output_video:
        output_video = os.path.join(source_dir, f"{base_name} (CTA).mp4")
    elif os.path.abspath(source_video).lower() == os.path.abspath(output_video).lower():
        is_same_file = True
        temp_final = output_video
        output_video = os.path.join(source_dir, f".temp_cta_{int(time.time()*1000)}.mp4")

    is_vertical = vh > vw

    # -------------------------------------------------------------
    # 1. CONTINUOUS ANIMATED STICKER AT BOTTOM (DEFAULT)
    # -------------------------------------------------------------
    if mode == "bottom_floating" or style_key == "youtube_animated_pills":
        assets = ensure_animated_cta_assets(lang=lang_code)
        apng_file = assets["apng"]

        if is_vertical:
            # Lowered Shorts safe zone: exactly 200px from bottom (above mobile sound/channel bar)
            if vw != 1080:
                scale_w = min(int(vw * 0.72), 760)
                prep_filter = f"[1:v]scale={scale_w}:-1,"
            else:
                prep_filter = "[1:v]"
            pos_y = "H-h-200" if vh >= 1600 else "H-h-int(H*0.10)"
            pos_x = "(W-w)/2"
        else:
            # 16:9 widescreen or square
            scale_w = min(int(vw * 0.38), 540)
            prep_filter = f"[1:v]scale={scale_w}:-1,"
            pos_y = "H-h-45"
            pos_x = "(W-w)/2"

        fade_out_start = max(0.8, total_dur - 0.45)
        filter_complex = (
            f"{prep_filter}fade=t=out:st={fade_out_start:.2f}:d=0.35:alpha=1[cta];"
            f"[0:v][cta]overlay={pos_x}:{pos_y}:shortest=1[vout]"
        )

        cmd = [
            "ffmpeg", "-y",
            "-i", source_video,
            "-ignore_loop", "0", "-i", apng_file,
            "-filter_complex", filter_complex,
            "-map", "[vout]",
            "-map", "0:a?",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "20",
            "-c:a", "copy",
            output_video
        ]

    # -------------------------------------------------------------
    # 2. CLASSIC OUTRO CARD (END OF VIDEO)
    # -------------------------------------------------------------
    else:
        actual_outro_dur = min(outro_duration, max(1.5, total_dur * 0.35))
        start_t = max(0.0, total_dur - actual_outro_dur)
        card_fade_start = start_t + 0.35
        fade_dur = 0.45
        dim_opacity = 1.0 if bg_mode == "deep_black" else 0.78

        if is_vertical:
            card_w = min(int(vw * 0.86), 900)
            card_h = int(card_w * 0.40)
            card_y = "(H-h)/2"
        else:
            card_w = min(int(vw * 0.52), 900)
            card_h = int(card_w * 0.40)
            card_y = "(H-h)/2"

        cache_dir = os.path.join(source_dir, ".cache_outro")
        os.makedirs(cache_dir, exist_ok=True)
        card_png = os.path.join(cache_dir, f"card_{style_key}_{card_w}x{card_h}.png")
        create_outro_card_image(style_key=style_key, width=card_w, height=card_h, output_png=card_png)

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

    logger.info(f"Running CTA/Outro overlay render: {' '.join(cmd)}")
    t0 = time.time()
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        logger.error(f"FFmpeg CTA error: {res.stderr[-400:]}")
        raise RuntimeError(f"Помилка створення CTA: {res.stderr[-250:]}")

    if is_same_file and temp_final:
        if os.path.exists(temp_final):
            try:
                os.remove(temp_final)
            except Exception:
                pass
        os.replace(output_video, temp_final)
        output_video = temp_final

    elapsed = time.time() - t0
    logger.info(f"CTA rendered in {elapsed:.2f}s: {output_video}")
    return {
        "success": True,
        "path": output_video.replace('\\', '/'),
        "filename": os.path.basename(output_video),
        "style": style_key,
        "mode": mode,
        "bg_mode": bg_mode,
        "width": vw,
        "height": vh,
        "render_time_sec": round(elapsed, 2)
    }
