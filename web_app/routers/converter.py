import os
import re
import subprocess
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

import database
import i18n
import video_outro
import ai_video_analyst
from core.config import logger

router = APIRouter()

class ConvertShortsRequest(BaseModel):
    source_path: str
    start_time: float = 0.0
    duration: float = 30.0
    zoom: float = 1.15
    y_position: float = 0.5
    blur_radius: int = 25
    dim: float = 0.18
    title: Optional[str] = None
    lang: Optional[str] = None
    with_outro: bool = False
    outro_style: Optional[str] = "youtube_classic"
    outro_bg: Optional[str] = "deep_black"

@router.post("/convert-to-shorts")
def convert_to_shorts(req: ConvertShortsRequest, request: Request):
    client_accept = request.headers.get("accept-language")
    active_lang = i18n.resolve_lang(req.lang, accept_language=client_accept)

    if not os.path.exists(req.source_path):
        raise HTTPException(status_code=404, detail=i18n.t("error.file_not_found", lang=active_lang))

    source_dir = os.path.dirname(req.source_path)
    base_name = os.path.splitext(os.path.basename(req.source_path))[0]

    start_t = max(0.0, req.start_time)
    duration_s = max(1.0, min(60.0, req.duration))
    zoom_val = max(1.0, min(2.0, req.zoom))
    y_pos = max(0.0, min(1.0, req.y_position))
    blur_r = max(5, min(60, req.blur_radius))
    dim_val = max(0.0, min(0.6, req.dim))
    brightness_arg = -dim_val

    user_title = req.title.strip() if req.title else f"{base_name} (Shorts)"
    if not "#Shorts" in user_title:
        user_title += " #Shorts"

    safe_base = re.sub(r'[\\/*?:"<>|]', "", user_title.replace(" #Shorts", "")).strip()
    if not safe_base:
        safe_base = f"{base_name}_shorts"
    out_filename = f"Short - {safe_base}.mp4"
    output_path = os.path.join(source_dir, out_filename)

    if os.path.abspath(output_path).lower() == os.path.abspath(req.source_path).lower():
        output_path = os.path.join(source_dir, f"{safe_base}_converted.mp4")

    w_scaled = int(1080 * zoom_val)
    if w_scaled % 2 != 0:
        w_scaled += 1

    filter_complex = (
        f"[0:v]split=2[bg_in][fg_in];"
        f"[bg_in]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur={blur_r}:5,eq=brightness={brightness_arg}[bg];"
        f"[fg_in]scale={w_scaled}:-2,crop=1080:ih:(iw-1080)/2:0[fg];"
        f"[bg][fg]overlay=0:(1920-h)*{y_pos}[vout]"
    )

    cmd = [
        'ffmpeg', '-y',
        '-ss', str(start_t),
        '-t', str(duration_s),
        '-i', req.source_path,
        '-filter_complex', filter_complex,
        '-map', '[vout]',
        '-map', '0:a:0?',
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '22',
        '-c:a', 'aac',
        '-b:a', '192k',
        output_path
    ]

    logger.info(f"Running shorts conversion: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        logger.error(f"FFmpeg conversion error: {result.stderr}")
        raise HTTPException(status_code=500, detail=i18n.t("error.ffmpeg_error", lang=active_lang, detail=result.stderr[-300:]))

    if req.with_outro:
        try:
            logger.info(f"Applying Like & Subscribe outro to converted short: {output_path} (lang={active_lang})")
            video_outro.apply_outro_overlay(
                source_video=output_path,
                output_video=output_path,
                style_key=req.outro_style or ("ukrainian_native" if active_lang.startswith("uk") else "youtube_classic"),
                bg_mode=req.outro_bg or "deep_black",
                outro_duration=2.8,
                lang=active_lang
            )
        except Exception as oe:
            logger.warning(f"Could not apply outro to short {output_path}: {oe}")

    desc = i18n.t("shorts.description", lang=active_lang, base_name=base_name)
    tags_list = i18n.t("shorts.tags", lang=active_lang)

    norm_path = output_path.replace('\\', '/')
    database.upsert_record(
        path=norm_path,
        filename=os.path.basename(output_path),
        title=user_title,
        description=desc,
        tags=tags_list if isinstance(tags_list, list) else ["Shorts", "Gaming"],
        is_shorts=True,
        status="planning",
        scheduled_for=None
    )

    return {
        "success": True,
        "path": norm_path,
        "filename": os.path.basename(output_path),
        "title": user_title,
        "duration": duration_s
    }

class RenderPlannedShortRequest(BaseModel):
    source_path: str = Field(..., description="Source 16:9 video path")
    start_sec: float = Field(..., description="Start cut timestamp in seconds")
    end_sec: float = Field(..., description="End cut timestamp in seconds")
    title: str = Field(..., description="Title of the Short")
    segments: Optional[List[Dict[str, Any]]] = Field(None, description="Optional multi-cut segments")
    with_voiceover: bool = Field(False, description="Whether to narrate script")
    voiceover_script: Optional[str] = Field(None, description="Script to narrate")
    voice: Optional[str] = Field("en-US-GuyNeural", description="Voice ID")
    zoom: Optional[float] = Field(1.15, description="Zoom multiplier: 1.0 to 1.5")
    y_pos: Optional[float] = Field(0.5, description="Vertical framing position: 0.0 to 1.0")
    blur_radius: Optional[int] = Field(25, description="Blur intensity for background")
    dim: Optional[float] = Field(0.18, description="Background dimming factor")
    with_outro: bool = Field(False, description="Whether to overlay Like & Subscribe outro CTA")
    outro_style: Optional[str] = Field("youtube_classic", description="Outro style key")
    outro_bg: Optional[str] = Field("deep_black", description="Outro background mode: deep_black or cinematic_dark")

@router.post("/ai/render-planned-short")
def render_planned_short_endpoint(req: RenderPlannedShortRequest):
    try:
        result = ai_video_analyst.render_planned_short(
            source_path=req.source_path,
            start_sec=req.start_sec,
            end_sec=req.end_sec,
            title=req.title,
            segments=req.segments,
            with_voiceover=req.with_voiceover,
            voiceover_script=req.voiceover_script,
            voice=req.voice or "en-US-GuyNeural",
            zoom=req.zoom or 1.15,
            y_pos=req.y_pos or 0.5,
            blur_radius=req.blur_radius or 25,
            dim=req.dim or 0.18,
            with_outro=req.with_outro,
            outro_style=req.outro_style or "youtube_classic",
            outro_bg=req.outro_bg or "deep_black"
        )
        return result
    except Exception as e:
        logger.error(f"Error rendering planned short: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
