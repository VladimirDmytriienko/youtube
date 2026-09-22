import os
import json
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

import database
import video_outro
from core.config import logger

router = APIRouter()

class ApplyOutroRequest(BaseModel):
    video_path: str = Field(..., description="Absolute path to video file")
    output_path: Optional[str] = Field(None, description="Optional target output path")
    style_key: Optional[str] = Field("youtube_animated_pills", description="Outro style key")
    mode: Optional[str] = Field("bottom_floating", description="'bottom_floating' (all video) or 'outro_card' (last 2.8s)")
    bg_mode: Optional[str] = Field("deep_black", description="'deep_black' or 'cinematic_dark'")
    outro_duration: Optional[float] = Field(2.8, description="Duration of outro overlay in seconds")
    lang: Optional[str] = Field("en", description="Target language (default 'en')")

@router.get("/video/outro-styles")
def get_outro_styles_endpoint():
    return {
        "styles": [
            {
                "id": "youtube_animated_pills",
                "name": "Жива анімація (YouTube Like & Subscribe)",
                "lines": ["LIKE", "SUBSCRIBE"],
                "badge": "🔥 Жива анімація",
                "accent": "#FF0000",
                "is_animated": True,
                "lang": "all"
            }
        ],
        "bg_modes": [
            {
                "id": "deep_black",
                "name": "Чорний екран (Deep Black 100%)",
                "description": "Повне плавне переведення в чорний екран під текстом"
            },
            {
                "id": "cinematic_dark",
                "name": "Кінематографічне затемнення (78%)",
                "description": "Відео продовжується, плавно затемнюючись позаду картки"
            }
        ]
    }

@router.post("/video/apply-outro")
def apply_outro_endpoint(req: ApplyOutroRequest):
    try:
        clean_path = req.video_path.replace('/', os.sep).replace('\\', os.sep)
        if not os.path.exists(clean_path):
            raise HTTPException(status_code=404, detail=f"Відео не знайдено: {clean_path}")

        result = video_outro.apply_outro_overlay(
            source_video=clean_path,
            output_video=req.output_path,
            style_key=req.style_key or "youtube_animated_pills",
            mode=req.mode or "bottom_floating",
            bg_mode=req.bg_mode or "deep_black",
            outro_duration=req.outro_duration or 2.8,
            lang=req.lang or "en"
        )

        out_path = result["path"]
        base_name = os.path.splitext(os.path.basename(out_path))[0]
        vw = result.get("width", 1080)
        vh = result.get("height", 1920)
        is_shorts = (vh > vw) or ("#Shorts" in base_name) or ("Short -" in base_name)

        existing = database.get_record(clean_path)
        title = existing.get("title") if existing else base_name
        if not title:
            title = base_name
        desc = existing.get("description") if existing else "Підписуйтесь на канал та ставте лайк!"
        tags = existing.get("tags") if existing else ["Shorts", "Highlights", "Gaming"]
        if isinstance(tags, str):
            try:
                tags = json.loads(tags)
            except Exception:
                tags = [tags]

        database.upsert_record(
            path=out_path,
            filename=os.path.basename(out_path),
            title=title,
            description=desc,
            tags=tags,
            is_shorts=is_shorts,
            status="planning"
        )

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error applying outro: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
