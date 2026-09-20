import os
import subprocess
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

import database
import video_collage
from core.config import BASE_DIR, logger

router = APIRouter()

class BuildSplitScreenRequest(BaseModel):
    video_top: str = Field(..., description="Path to top (or left) video")
    video_bottom: str = Field(..., description="Path to bottom (or right) video")
    output_path: Optional[str] = Field(None, description="Custom output file path")
    layout: Optional[str] = Field("vertical_stack", description="'vertical_stack' (9:16 Shorts) or 'horizontal_stack' (16:9 Full)")
    crop_sides_pct: Optional[float] = Field(10.0, description="Percentage of width to crop from each side")
    top_offset_sec: Optional[float] = Field(0.0, description="Start offset for top video in seconds")
    bottom_offset_sec: Optional[float] = Field(0.0, description="Start offset for bottom video in seconds")
    duration: Optional[float] = Field(None, description="Max duration in seconds")
    audio_mode: Optional[str] = Field("mix", description="'mix', 'top', or 'bottom'")
    top_label: Optional[str] = Field(None, description="Optional label for top video")
    bottom_label: Optional[str] = Field(None, description="Optional label for bottom video")

@router.post("/ai/collage/build-split")
def build_split_endpoint(req: BuildSplitScreenRequest):
    try:
        if not req.output_path:
            top_base = os.path.splitext(os.path.basename(req.video_top))[0]
            bot_base = os.path.splitext(os.path.basename(req.video_bottom))[0]
            dir_name = os.path.dirname(req.video_top)
            is_vert = (req.layout or "vertical_stack") == "vertical_stack"
            prefix = "Short - Split" if is_vert else "Split Comparison"
            out_file = f"{prefix} - {top_base} vs {bot_base}{' #Shorts' if is_vert else ''}.mp4"
            target_output = os.path.join(dir_name, out_file)
        else:
            target_output = req.output_path

        result = video_collage.build_split_screen_video(
            video_top=req.video_top,
            video_bottom=req.video_bottom,
            output_path=target_output,
            layout=req.layout or "vertical_stack",
            crop_sides_pct=req.crop_sides_pct if req.crop_sides_pct is not None else 10.0,
            top_offset_sec=req.top_offset_sec or 0.0,
            bottom_offset_sec=req.bottom_offset_sec or 0.0,
            duration=req.duration,
            audio_mode=req.audio_mode or "mix",
            top_label=req.top_label,
            bottom_label=req.bottom_label
        )
        return result
    except Exception as e:
        logger.error(f"Error building split screen video: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

class GenerateLongVideoPackageRequest(BaseModel):
    video_title_hint: str = Field(..., description="Title hint or concept")
    game_or_devices: str = Field(..., description="What devices/games are being compared")
    key_points: Optional[str] = Field(None, description="Key notes or moments")
    language: Optional[str] = Field("uk", description="Target language ('uk' or 'en')")

@router.post("/ai/collage/generate-package")
def generate_long_package_endpoint(req: GenerateLongVideoPackageRequest):
    try:
        package = video_collage.generate_long_video_package(
            video_title_hint=req.video_title_hint,
            game_or_devices=req.game_or_devices,
            key_points=req.key_points,
            language=req.language or "uk"
        )
        return {"success": True, "package": package}
    except Exception as e:
        logger.error(f"Error generating long video package: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

class TimelineSegmentItem(BaseModel):
    id: str
    sourcePath: str
    startSec: float
    endSec: float
    title: Optional[str] = None

class RenderTimelineRequest(BaseModel):
    segments: List[TimelineSegmentItem]
    output_filename: Optional[str] = None
    target_format: Optional[str] = "original"

@router.post("/editor/render-timeline")
def render_timeline_endpoint(req: RenderTimelineRequest):
    if not req.segments:
        raise HTTPException(status_code=400, detail="Список фрагментів порожній.")

    for s in req.segments:
        if not os.path.exists(s.sourcePath):
            raise HTTPException(status_code=404, detail=f"Файл не знайдено: {s.sourcePath}")

    first_dir = os.path.dirname(req.segments[0].sourcePath)
    if not first_dir or not os.path.exists(first_dir):
        first_dir = BASE_DIR

    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_name = req.output_filename.strip() if req.output_filename else f"Edited_Compilation_{timestamp_str}.mp4"
    if not out_name.lower().endswith(".mp4"):
        out_name += ".mp4"
    output_path = os.path.join(first_dir, out_name)

    inputs_args = []
    filter_parts = []
    concat_inputs = []

    for idx, s in enumerate(req.segments):
        duration = max(0.1, s.endSec - s.startSec)
        inputs_args.extend(["-ss", str(s.startSec), "-t", str(duration), "-i", s.sourcePath])
        
        if req.target_format == "9:16":
            filter_parts.append(
                f"[{idx}:v]split=2[bg_in{idx}][fg_in{idx}];"
                f"[bg_in{idx}]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=25:5[bg{idx}];"
                f"[fg_in{idx}]scale=1080:-2,crop=1080:ih:(iw-1080)/2:0[fg{idx}];"
                f"[bg{idx}][fg{idx}]overlay=0:(1920-h)*0.5,setsar=1[v{idx}]"
            )
        elif req.target_format == "16:9":
            filter_parts.append(
                f"[{idx}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1[v{idx}]"
            )
        else:
            filter_parts.append(
                f"[{idx}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1[v{idx}]"
            )

        filter_parts.append(f"[{idx}:a:0?]aformat=sample_rates=48000:channel_layouts=stereo[a{idx}]")
        concat_inputs.append(f"[v{idx}][a{idx}]")

    n_segs = len(req.segments)
    concat_filter = f"{''.join(concat_inputs)}concat=n={n_segs}:v=1:a=1[vout][aout]"
    filter_parts.append(concat_filter)

    full_filter = ";".join(filter_parts)

    cmd = ["ffmpeg", "-y"] + inputs_args + [
        "-filter_complex", full_filter,
        "-map", "[vout]",
        "-map", "[aout]",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "21",
        "-c:a", "aac",
        "-b:a", "192k",
        output_path
    ]

    logger.info(f"Executing timeline render: {' '.join(cmd)}")
    res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
    if res.returncode != 0:
        logger.error(f"Timeline render error: {res.stderr[-500:]}")
        raise HTTPException(status_code=500, detail=f"Помилка рендеру: {res.stderr[-300:]}")

    norm_path = output_path.replace('\\', '/')
    is_shorts = (req.target_format == "9:16")
    base_title = os.path.splitext(out_name)[0]

    database.upsert_record(
        path=norm_path,
        filename=os.path.basename(output_path),
        title=base_title,
        description=f"Відео змонтовано у таймлайн-редакторі з {n_segs} фрагментів.",
        tags=["Edited", "Compilation", "Shorts" if is_shorts else "Video"],
        is_shorts=is_shorts,
        status="planning"
    )

    return {
        "success": True,
        "path": norm_path,
        "filename": os.path.basename(output_path),
        "segment_count": n_segs
    }
