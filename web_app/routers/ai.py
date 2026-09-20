import os
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel, Field

import database
import ai_assistant
import ai_video_analyst
from core.config import logger
from core.ai_models import (
    AVAILABLE_MODELS,
    get_active_vision_model,
    get_active_text_model
)
from routers.videos import get_frame_candidates

router = APIRouter()

class SaveAiKeyRequest(BaseModel):
    api_key: str

class TestAiKeyRequest(BaseModel):
    api_key: Optional[str] = None

class SaveAiSettingsRequest(BaseModel):
    vision_model: Optional[str] = None
    text_model: Optional[str] = None
    custom_vision_model: Optional[str] = None
    custom_text_model: Optional[str] = None

class GenerateMetadataRequest(BaseModel):
    title: str
    description: Optional[str] = ""
    user_prompt: Optional[str] = None
    is_shorts: bool = True
    include_frames: bool = False
    frame_paths: Optional[List[str]] = None
    dual_language: bool = True
    languages: Optional[List[str]] = None
    style: Optional[str] = "viral"

class ThumbnailAdviceRequest(BaseModel):
    title: str
    user_prompt: Optional[str] = None
    frame_paths: List[str]

class GenerateThumbnailRequest(BaseModel):
    video_path: Optional[str] = None
    title: str = Field(..., description="Title of the video")
    description: Optional[str] = Field(None, description="Optional description or context")
    user_prompt: Optional[str] = Field(None, description="Optional custom prompt or context")
    is_shorts: bool = Field(False, description="Whether this is a vertical 9:16 Short")
    style: Optional[str] = Field("cinematic", description="Visual style")
    frame_paths: Optional[List[str]] = Field(None, description="Paths of extracted video frames to use as visual reference")

class AnalyzeVideoRequest(BaseModel):
    video_path: str = Field(..., description="Absolute path to video file")
    user_prompt: Optional[str] = Field(None, description="Optional creator guidance / goal")
    samples: Optional[int] = Field(40, description="Number of sample frames to inspect")
    language: Optional[str] = Field("en", description="Target language: 'en' or 'uk'")
    target_count: Optional[int] = Field(5, description="Target number of Shorts: 1, 3, 5, or 0 for auto")
    scenario_preset: Optional[str] = Field("diverse_mix", description="Scenario style: 'diverse_mix', 'crashes', 'fails', 'skills', 'chronological'")

class PlanShortsRequest(BaseModel):
    timeline_data: Dict[str, Any] = Field(..., description="Timeline breakdown from Stage 1")
    user_prompt: Optional[str] = Field(None, description="Optional creator guidance / goal")
    language: Optional[str] = Field("en", description="Target language: 'en' or 'uk'")
    target_count: Optional[int] = Field(5, description="Target number of Shorts: 1, 3, 5, or 0 for auto")
    scenario_preset: Optional[str] = Field("diverse_mix", description="Scenario style: 'diverse_mix', 'crashes', 'fails', 'skills', 'chronological'")

@router.get("/ai/status")
def get_ai_status():
    key = ai_assistant.get_api_key()
    return {
        "has_key": bool(key),
        "masked_key": ai_assistant.mask_key(key),
        "usage": database.get_ai_usage_summary()
    }

@router.get("/ai/usage")
def get_ai_usage():
    return database.get_ai_usage_summary()

@router.get("/ai/models")
def get_ai_models():
    return {
        "models": AVAILABLE_MODELS,
        "active_vision_model": get_active_vision_model(),
        "active_text_model": get_active_text_model(),
        "raw_vision_setting": database.get_setting("ai_vision_model", "gemini-2.5-flash"),
        "raw_text_setting": database.get_setting("ai_text_model", "gemini-2.5-flash"),
        "custom_vision_model": database.get_setting("ai_custom_vision_model", ""),
        "custom_text_model": database.get_setting("ai_custom_text_model", "")
    }

@router.get("/ai/settings")
def get_ai_settings():
    return {
        "vision_model": get_active_vision_model(),
        "text_model": get_active_text_model(),
        "raw_vision_setting": database.get_setting("ai_vision_model", "gemini-2.5-flash"),
        "raw_text_setting": database.get_setting("ai_text_model", "gemini-2.5-flash"),
        "custom_vision_model": database.get_setting("ai_custom_vision_model", ""),
        "custom_text_model": database.get_setting("ai_custom_text_model", "")
    }

@router.post("/ai/settings")
def update_ai_settings(req: SaveAiSettingsRequest):
    if req.vision_model is not None:
        database.set_setting("ai_vision_model", req.vision_model.strip())
    if req.text_model is not None:
        database.set_setting("ai_text_model", req.text_model.strip())
    if req.custom_vision_model is not None:
        database.set_setting("ai_custom_vision_model", req.custom_vision_model.strip())
    if req.custom_text_model is not None:
        database.set_setting("ai_custom_text_model", req.custom_text_model.strip())
    return {
        "success": True,
        "vision_model": get_active_vision_model(),
        "text_model": get_active_text_model()
    }

@router.post("/ai/test")
def test_ai_key(req: TestAiKeyRequest):
    return ai_assistant.test_connection(req.api_key)

@router.post("/ai/save-key")
def save_ai_key(req: SaveAiKeyRequest):
    success = ai_assistant.save_api_key(req.api_key)
    if not success:
        raise HTTPException(status_code=500, detail="Не вдалося зберегти ключ")
    test_res = ai_assistant.test_connection(req.api_key)
    return {
        "success": True,
        "test": test_res,
        "masked_key": ai_assistant.mask_key(req.api_key)
    }

@router.post("/ai/generate")
def generate_ai_metadata(req: GenerateMetadataRequest):
    try:
        res = ai_assistant.generate_metadata(
            title=req.title,
            description=req.description,
            user_prompt=req.user_prompt,
            is_shorts=req.is_shorts,
            include_frames=req.include_frames,
            frame_paths=req.frame_paths,
            dual_language=req.dual_language,
            languages=req.languages,
            style=req.style
        )
        return res
    except Exception as e:
        logger.error(f"AI generation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai/thumbnail-advice")
def get_thumbnail_advice(req: ThumbnailAdviceRequest):
    try:
        res = ai_assistant.get_thumbnail_advice(
            title=req.title,
            user_prompt=req.user_prompt,
            frame_paths=req.frame_paths
        )
        return res
    except Exception as e:
        logger.error(f"Thumbnail advice error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai/transcribe-audio")
async def transcribe_audio_endpoint(file: UploadFile = File(...)):
    try:
        content = await file.read()
        mime_type = file.content_type or "audio/webm"
        clean_mime = mime_type.split(';')[0].strip()
        result = ai_assistant.transcribe_audio(content, mime_type=clean_mime)
        return result
    except Exception as e:
        logger.error(f"Audio transcription error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai/generate-thumbnail")
def generate_thumbnail_endpoint(req: GenerateThumbnailRequest):
    try:
        frames = req.frame_paths or []
        if not frames and req.video_path and os.path.exists(req.video_path):
            try:
                extracted = get_frame_candidates(req.video_path)
                frames = [c["thumb_path"] for c in extracted if c.get("thumb_path")]
            except Exception as fe:
                logger.warning(f"Could not auto-extract frames from {req.video_path}: {fe}")

        res = ai_assistant.generate_thumbnail_image(
            title=req.title,
            description=req.description,
            user_prompt=req.user_prompt,
            is_shorts=req.is_shorts,
            style=req.style,
            frame_paths=frames
        )
        return res
    except Exception as e:
        logger.error(f"Thumbnail generation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai/analyze-video")
def analyze_video_endpoint(req: AnalyzeVideoRequest):
    try:
        res = ai_video_analyst.analyze_video_timeline(
            video_path=req.video_path,
            user_prompt=req.user_prompt,
            target_samples=req.samples or 40
        )
        return {"success": True, "data": res}
    except Exception as e:
        logger.error(f"Error analyzing video timeline: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai/plan-shorts")
def plan_shorts_endpoint(req: PlanShortsRequest):
    try:
        plan = ai_video_analyst.plan_shorts_strategy(
            timeline_data=req.timeline_data,
            user_prompt=req.user_prompt,
            language=req.language or "en",
            target_count=req.target_count if req.target_count is not None else 5,
            scenario_preset=req.scenario_preset or "diverse_mix"
        )
        return {"success": True, "plan": plan}
    except Exception as e:
        logger.error(f"Error planning shorts: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai/analyze-and-plan-shorts")
def analyze_and_plan_endpoint(req: AnalyzeVideoRequest):
    try:
        timeline = ai_video_analyst.analyze_video_timeline(
            video_path=req.video_path,
            user_prompt=req.user_prompt,
            target_samples=req.samples or 40
        )
        plan = ai_video_analyst.plan_shorts_strategy(
            timeline_data=timeline,
            user_prompt=req.user_prompt,
            language=req.language or "en",
            target_count=req.target_count if req.target_count is not None else 5,
            scenario_preset=req.scenario_preset or "diverse_mix"
        )
        return {
            "success": True,
            "timeline": timeline,
            "plan": plan
        }
    except Exception as e:
        logger.error(f"Error in full shorts pipeline: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
