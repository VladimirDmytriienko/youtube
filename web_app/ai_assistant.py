import os
import re
import time
import json
import base64
import logging
import urllib.request
import urllib.error
import urllib.parse
from typing import Optional, Dict, Any, List
import database

logger = logging.getLogger("AIAssistant")

KEY_FILE = 'e:/youtube/gemini_key.txt'
ENV_FILE = 'e:/youtube/.env'

from core.ai_models import get_active_text_model, get_model_cascade, AVAILABLE_MODELS

def get_api_key() -> str:
    """Retrieves the Gemini API key from key file or environment variable."""
    if os.path.exists(KEY_FILE):
        try:
            with open(KEY_FILE, 'r', encoding='utf-8') as f:
                k = f.read().strip()
                if k:
                    return k
        except Exception:
            pass

    if os.path.exists(ENV_FILE):
        try:
            with open(ENV_FILE, 'r', encoding='utf-8') as f:
                for line in f:
                    if line.startswith('GEMINI_API_KEY='):
                        return line.split('=', 1)[1].strip()
        except Exception:
            pass

    return os.environ.get('GEMINI_API_KEY', '')

def save_api_key(key: str) -> bool:
    """Saves the Gemini API key to gemini_key.txt and .env."""
    key = key.strip()
    try:
        with open(KEY_FILE, 'w', encoding='utf-8') as f:
            f.write(key)
        with open(ENV_FILE, 'w', encoding='utf-8') as f:
            f.write(f"GEMINI_API_KEY={key}\n")
        os.environ['GEMINI_API_KEY'] = key
        return True
    except Exception as e:
        logger.error(f"Failed to save Gemini API key: {e}")
        return False

def mask_key(key: str) -> str:
    if not key:
        return ""
    if len(key) <= 10:
        return "********"
    return key[:6] + "..." + key[-4:]

def test_connection(key: Optional[str] = None, model: Optional[str] = None) -> Dict[str, Any]:
    api_key = (key or get_api_key()).strip()
    if not api_key:
        return {"success": False, "error": "API ключ не вказано"}

    payload = {
        "contents": [{"parts": [{"text": "Ping"}]}]
    }

    last_error = "Невідома помилка"
    target_model = (model or get_active_text_model()).strip()
    models_to_try = get_model_cascade(target_model)

    for m in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={api_key}"
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode('utf-8'),
                headers={'Content-Type': 'application/json'}
            )
            resp = urllib.request.urlopen(req, timeout=8)
            if resp.status == 200:
                return {
                    "success": True,
                    "model": m,
                    "masked_key": mask_key(api_key),
                    "message": f"З'єднання успішне! Активна модель: {m}"
                }
        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8', errors='ignore')
            logger.warning(f"Test model {m} failed with HTTP {e.code}: {err_body[:200]}")
            try:
                err_json = json.loads(err_body)
                last_error = err_json.get('error', {}).get('message', f"HTTP {e.code}")
            except Exception:
                last_error = f"HTTP {e.code}"
        except Exception as e:
            logger.warning(f"Test model {m} error: {e}")
            last_error = str(e)

    return {"success": False, "error": last_error}

def generate_metadata(
    title: str,
    description: Optional[str] = None,
    user_prompt: Optional[str] = None,
    is_shorts: bool = True,
    include_frames: bool = False,
    frame_paths: Optional[List[str]] = None,
    dual_language: bool = True,
    languages: Optional[List[str]] = None,
    style: Optional[str] = "viral"
) -> Dict[str, Any]:
    api_key = get_api_key()
    if not api_key:
        raise RuntimeError("Gemini API ключ не налаштовано. Будь ласка, вкажіть його у вікні налаштувань.")

    format_desc = "YouTube Shorts (9:16 vertical short format, under 60s, needs high CTR, snappy hooks, #Shorts in title)" if is_shorts else "Regular YouTube 16:9 Video"

    system_prompt = f"""
You are an elite, adaptable YouTube Growth & SEO Strategist for global channels.
You work across ANY game genre and ANY content type:
- Skateboarding & Extreme Sports (Skate 3/4, Tony Hawk's Pro Skater, Session: Skate Sim, Skater XL, BMX, Snowboarding)
- Combat Sports & Wrestling (WWE 2K, UFC, AEW Fight Forever, Boxing)
- Fighting & Arcade (Tekken, Street Fighter, Mortal Kombat, retro arcades, platformers)
- Racing & Motorsport (Sim-racing, arcade racers, demolition, karting, rally)
- Traditional Sports (EA Sports FC / FIFA, NBA 2K, Madden, eFootball)
- Shooters & Battle Royales (Warzone, CS2, Apex Legends, Valorant, Call of Duty, Fortnite)
- RPGs, Action-Adventure & Sandbox (Cyberpunk, GTA, Elden Ring, Minecraft, Roblox)
- Real-World Video & Vlogging (tech reviews, podcasts, tutorials, lifestyle, entertainment)

PRIMARY LANGUAGE: English ("en") is the foundational global language for worldwide reach & maximum CPM.
Generate high-converting, viral YouTube metadata for a {format_desc}.

CORE ARCHITECTURAL PRINCIPLES (DYNAMIC & PROMPT-DRIVEN):
1. ANCHOR ON THE CREATOR'S INPUT:
   - Carefully analyze the Creator's custom prompt/voice note, video title/filename, and existing context.
   - Do NOT assume a specific game or hardware unless indicated by the creator, the title, or the visual frames.
   - Dynamically identify the Game Title/Topic and its exact genre (e.g. Tony Hawk, Skate, WWE 2K, EA Sports FC, Wreckfest, GTA, Tekken, Minecraft, etc.).
   - Amplify the creator's real thoughts, hype, tactics, and emotions into professional, engaging storytelling.

2. SYSTEM / HARDWARE SPECS (STRICT RULE):
   - ONLY IF the creator explicitly mentioned hardware, console, or specs in their prompt (e.g., RTX 3050, ASUS TUF, Core i5, 60fps, 4K, Xbox Series X, PS5), include a dedicated, clean specs block in the description and corresponding hardware tags.
   - IF NO specs were provided, DO NOT invent or hallucinate computer components. Focus entirely on the gameplay action, storyline, tactics, and highlights!

3. GENRE-ACCURATE COMPETITOR & DISCOVERY HOOKS:
   - Dynamically identify true peers, competitors, and franchise history for the DETECTED subject (e.g., for skateboarding: Skate, Tony Hawk, Session, Skater XL; for wrestling: WWE 2K, AEW, UFC; for football: EA FC, FIFA, eFootball; for racing: Forza, Need for Speed, Wreckfest; for fighting: Tekken, Mortal Kombat, Street Fighter; for shooters: Warzone, Apex, CS2; for general content: top channels in the niche).
   - Naturally weave these into the description and tags to capture algorithmic search and recommendation traffic.

GUIDELINES FOR EACH LANGUAGE IN "languages":
- "title": Compelling, viral localized title with high CTR, relevant emojis, and #Shorts (if Shorts). Max 90 characters.
- "description": Comprehensive, beautifully structured YouTube description in that target language (using clean Markdown formatting, line breaks, and emojis):
  * ⚡ Hook & Story: 2-3 gripping sentences capturing the drama, clutch moment, or climax described by the creator.
  * 🎮 About the Game & Scenario: Contextualize the game, tournament/mode, map/track, and what makes this scene memorable.
  * 💻 PC Specs / Platform (CONDITIONAL): ONLY if hardware or platform was explicitly mentioned by the creator, format as:
    💻 System Specs:
    • Platform: [User's platform/device]
    • Hardware: [User's specs]
    • Performance: [FPS / settings if mentioned]
    (If no specs were provided, completely omit this section!)
  * 🔍 For Fans Of (Search Hooks): A natural sentence referencing iconic franchise titles or genre peers to boost YouTube search indexing.
  * 💬 Question of the Day & Call to Action: Ask an engaging question directly tied to this specific moment (e.g., for a goal: "Was this skill or pure luck?", for a crash: "Who was at fault?"), with a call to Like & Subscribe 🔔.
- "tags": Array of 15-20 high-volume targeted keywords in that specific language (STRICTLY WITHOUT '#' SYMBOLS), keeping total keyword length comfortably under 380 characters (remember YouTube counts quotes for multi-word tags against its 500-char limit):
  * Official game title, series name, and popular abbreviations.
  * Specific gameplay actions/moments from creator's prompt.
  * Genre competitors and alternative search terms for this specific game.
  * Hardware / resolution / platform (ONLY if provided in creator's prompt).
  * High-traffic discovery terms ("gaming", "shorts", "walkthrough", "highlights", "best moments").

CRITICAL: Return STRICT JSON ONLY matching this exact structure:
{{
  "titles": ["English Title 1 #Shorts", "English Title 2 #Shorts", "English Title 3", "English Title 4", "English Title 5"],
  "category_id": "20",
  "languages": {{
    "en": {{
      "title": "English Title #Shorts",
      "description": "⚡ Gripping opening story...\\n\\n🎮 Game details...\\n\\n🔍 For fans of [peers]...\\n\\n💬 Question of the day... 🔔 Subscribe!\\n\\n#Game #Hashtags",
      "tags": ["tag1", "tag2", "tag3"]
    }},
    "uk": {{
      "title": "Українська назва #Shorts",
      "description": "⚡ Захоплюючий початок...\\n\\n🎮 Деталі гри...\\n\\n💬 Питання дня... 🔔 Підписуйтесь!\\n\\n#Ігри #Хештеги",
      "tags": ["тег1", "тег2", "тег3"]
    }},
    "es": {{
      "title": "Título en español #Shorts",
      "description": "⚡ Descripción detallada...\\n\\n#Hashtags",
      "tags": ["etiqueta1", "etiqueta2"]
    }},
    "de": {{
      "title": "Deutscher Titel #Shorts",
      "description": "⚡ Beschreibung auf Deutsch...\\n\\n#Hashtags",
      "tags": ["tag1", "tag2"]
    }},
    "pt": {{
      "title": "Título em português #Shorts",
      "description": "⚡ Descrição em português...\\n\\n#Hashtags",
      "tags": ["tag1", "tag2"]
    }},
    "ja": {{
      "title": "日本語タイトル #Shorts",
      "description": "⚡ 詳細な説明...\\n\\n#ハッシュタグ",
      "tags": ["タグ1", "タグ2"]
    }},
    "pl": {{
      "title": "Polski tytuł #Shorts",
      "description": "⚡ Szczegółowy opis...\\n\\n#Hashtagi",
      "tags": ["tag1", "tag2"]
    }}
  }}
}}
"""

    user_context = f"Video title/filename: '{title}'"
    if user_prompt and user_prompt.strip():
        user_context += f"\nCreator's custom prompt/idea: '{user_prompt.strip()}'"
    if description and description.strip():
        user_context += f"\nExisting description/context: '{description.strip()}'"

    parts = [{"text": system_prompt + "\n\n" + user_context}]

    # Include lightweight video frames if requested
    if include_frames and frame_paths:
        loaded = 0
        for fp in frame_paths:
            if fp and os.path.exists(fp):
                try:
                    with open(fp, "rb") as f:
                        b64 = base64.b64encode(f.read()).decode('utf-8')
                    parts.append({"text": f"Video frame reference #{loaded + 1}:"})
                    parts.append({
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": b64
                        }
                    })
                    loaded += 1
                    if loaded >= 3:
                        break
                except Exception as e:
                    logger.warning(f"Failed to load frame {fp}: {e}")

    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "response_mime_type": "application/json",
            "temperature": 0.7
        }
    }

    last_error = "Всі моделі Gemini недоступні на даний момент."
    for model in get_model_cascade(get_active_text_model()):
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode('utf-8'),
                headers={'Content-Type': 'application/json'}
            )
            resp = urllib.request.urlopen(req, timeout=35)
            if resp.status == 200:
                raw_body = resp.read().decode('utf-8')
                data = json.loads(raw_body)
                content_str = data['candidates'][0]['content']['parts'][0]['text']
                parsed = json.loads(content_str)
                if not parsed.get("category_id"):
                    parsed["category_id"] = "20"

                # Ensure languages dictionary is normalized and mirror uk/en for backward compatibility
                langs = parsed.get("languages", {})
                if "uk" in langs and "uk" not in parsed:
                    parsed["uk"] = langs["uk"]
                if "en" in langs and "en" not in parsed:
                    parsed["en"] = langs["en"]

                # Extract token usage metadata from Gemini
                usage_meta = data.get('usageMetadata', {})
                prompt_tokens = usage_meta.get('promptTokenCount', 0)
                candidates_tokens = usage_meta.get('candidatesTokenCount', 0)
                total_tokens = usage_meta.get('totalTokenCount', prompt_tokens + candidates_tokens)

                usage_dict = {
                    "prompt_tokens": prompt_tokens,
                    "candidates_tokens": candidates_tokens,
                    "total_tokens": total_tokens
                }
                database.log_ai_usage("metadata", model, prompt_tokens, candidates_tokens, total_tokens)

                logger.info(f"Successfully generated YouTube metadata using Gemini ({model}), tokens: {total_tokens}")
                return {
                    "success": True,
                    "model_used": model,
                    "data": parsed,
                    "usage": usage_dict
                }
        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8', errors='ignore')
            logger.warning(f"Generation with {model} failed (HTTP {e.code}): {err_body[:200]}")
            last_error = f"HTTP {e.code}: {err_body[:150]}"
        except Exception as e:
            logger.warning(f"Generation with {model} error: {e}")
            last_error = str(e)

    raise RuntimeError(f"Помилка генерації через Gemini: {last_error}")

def get_thumbnail_advice(
    title: str,
    user_prompt: Optional[str] = None,
    frame_paths: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Multimodal visual inspection: analyzes up to 4 candidate frames,
    determines the highest-CTR frame, and suggests viral thumbnail banner text & design tips.
    """
    api_key = get_api_key()
    if not api_key:
        raise RuntimeError("Gemini API ключ не налаштовано.")

    system_instruction = """You are a top-tier YouTube Thumbnail & CTR Expert.
Analyze the provided video frames (labeled Frame 1, Frame 2, etc.) and video context.
Your job:
1. "best_frame_index": 0-based integer index of the single most click-worthy frame (0 for Frame 1, 1 for Frame 2, 2 for Frame 3, etc.).
2. "reason": 1-2 sentence explanation in Ukrainian why this frame will generate the highest CTR and clickability.
3. "banner_text": 2-4 words viral, high-converting thumbnail text overlay in Ukrainian (e.g. 'ЯК ВІН ВИЖИВ?!', 'ШОК НА СТАРТІ!').
4. "design_tip": 1-2 practical tips in Ukrainian for thumbnail editing (contrast, bright arrows, yellow/red bold font with black stroke).

Return STRICT JSON ONLY matching:
{
  "best_frame_index": 0,
  "reason": "...",
  "banner_text": "...",
  "design_tip": "..."
}
"""

    context = f"Video title/topic: '{title}'"
    if user_prompt and user_prompt.strip():
        context += f"\nCreator's note on key moment: '{user_prompt.strip()}'"

    parts = [{"text": system_instruction + "\n\n" + context}]

    valid_frames = [p for p in (frame_paths or []) if p and os.path.exists(p)]
    if not valid_frames:
        raise RuntimeError("Немає доступних кадрів для аналізу значка.")

    for idx, fp in enumerate(valid_frames[:4]):
        try:
            with open(fp, "rb") as f:
                b64 = base64.b64encode(f.read()).decode("utf-8")
            parts.append({"text": f"--- Frame {idx + 1} ---"})
            parts.append({
                "inline_data": {
                    "mime_type": "image/jpeg",
                    "data": b64
                }
            })
        except Exception as e:
            logger.warning(f"Error reading frame {fp}: {e}")

    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {"response_mime_type": "application/json", "temperature": 0.5}
    }

    last_error = "Всі моделі Gemini недоступні на даний момент."
    for model in get_model_cascade(get_active_text_model()):
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode('utf-8'),
                headers={'Content-Type': 'application/json'}
            )
            resp = urllib.request.urlopen(req, timeout=20)
            if resp.status == 200:
                raw_body = resp.read().decode('utf-8')
                data = json.loads(raw_body)
                content_str = data['candidates'][0]['content']['parts'][0]['text']
                parsed = json.loads(content_str)

                # Extract token usage metadata from Gemini
                usage_meta = data.get('usageMetadata', {})
                prompt_tokens = usage_meta.get('promptTokenCount', 0)
                candidates_tokens = usage_meta.get('candidatesTokenCount', 0)
                total_tokens = usage_meta.get('totalTokenCount', prompt_tokens + candidates_tokens)

                usage_dict = {
                    "prompt_tokens": prompt_tokens,
                    "candidates_tokens": candidates_tokens,
                    "total_tokens": total_tokens
                }
                database.log_ai_usage("thumbnail_advice", model, prompt_tokens, candidates_tokens, total_tokens)

                logger.info(f"Successfully generated thumbnail advice with {model}, tokens: {total_tokens}")
                return {
                    "success": True,
                    "model_used": model,
                    "data": parsed,
                    "usage": usage_dict
                }
        except Exception as e:
            logger.warning(f"Thumbnail advice with {model} failed: {e}")
            last_error = str(e)

    raise RuntimeError(f"Помилка аналізу значка через Gemini: {last_error}")

def transcribe_audio(
    audio_bytes: bytes,
    mime_type: str = "audio/webm"
) -> Dict[str, Any]:
    """
    Transcribes audio bytes (e.g. voice prompt from microphone) using Gemini multimodal audio.
    Supports audio/webm, audio/wav, audio/mp3, audio/ogg, audio/mp4.
    """
    api_key = get_api_key()
    if not api_key:
        raise RuntimeError("Gemini API ключ не налаштовано.")

    clean_mime = mime_type.split(';')[0].strip().lower()
    if not clean_mime.startswith('audio/'):
        clean_mime = "audio/webm"

    b64_data = base64.b64encode(audio_bytes).decode('utf-8')
    prompt_text = (
        "Transcribe this user voice message into clean text. "
        "Match the language spoken (Ukrainian or English). "
        "Correct any small speech hesitations. Return ONLY the transcribed text, without any comments, quotes, or markdown formatting."
    )

    parts = [
        {"text": prompt_text},
        {
            "inline_data": {
                "mime_type": clean_mime,
                "data": b64_data
            }
        }
    ]

    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "temperature": 0.2
        }
    }

    last_error = "Всі моделі Gemini недоступні на даний момент."
    for model in get_model_cascade(get_active_text_model()):
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode('utf-8'),
                headers={'Content-Type': 'application/json'}
            )
            resp = urllib.request.urlopen(req, timeout=20)
            if resp.status == 200:
                raw_body = resp.read().decode('utf-8')
                data = json.loads(raw_body)
                transcribed_text = data['candidates'][0]['content']['parts'][0]['text'].strip()

                usage_meta = data.get('usageMetadata', {})
                prompt_tokens = usage_meta.get('promptTokenCount', 0)
                candidates_tokens = usage_meta.get('candidatesTokenCount', 0)
                total_tokens = usage_meta.get('totalTokenCount', prompt_tokens + candidates_tokens)

                usage_dict = {
                    "prompt_tokens": prompt_tokens,
                    "candidates_tokens": candidates_tokens,
                    "total_tokens": total_tokens
                }
                database.log_ai_usage("voice_prompt", model, prompt_tokens, candidates_tokens, total_tokens)

                logger.info(f"Successfully transcribed audio with {model}, tokens: {total_tokens}")
                return {
                    "success": True,
                    "text": transcribed_text,
                    "model_used": model,
                    "usage": usage_dict
                }
        except Exception as e:
            logger.warning(f"Audio transcription with {model} failed: {e}")
            last_error = str(e)

    raise RuntimeError(f"Помилка розпізнавання аудіо через Gemini: {last_error}")


THUMB_CACHE = 'e:/youtube/web_app/cache/thumbs'

def craft_thumbnail_prompt(
    title: str,
    description: Optional[str] = None,
    user_prompt: Optional[str] = None,
    is_shorts: bool = False,
    frame_paths: Optional[List[str]] = None
) -> str:
    """Uses Gemini Vision to inspect video frames and context, synthesizing an ultra-high-CTR visual prompt matching the real game scene."""
    api_key = get_api_key()
    if not api_key:
        return f"Hyper-dramatic cinematic YouTube gaming thumbnail for {title}, action-packed dynamic perspective, vivid saturated colors, volumetric rim lighting, 8k resolution"

    valid_frames = [p for p in (frame_paths or []) if p and os.path.exists(p)][:4]

    if valid_frames:
        instruction = (
            "You are an award-winning YouTube Thumbnail Creative Director & AI Prompt Artist (inspired by MrBeast and top gaming creators). "
            "Examine these actual video frames closely AND read the video title and creator's description/prompt. "
            "YOUR TASK: "
            "1. Identify the TRUE SUBJECT and GENRE of this video from the visual frames and context: "
            "   - If Skateboarding/Extreme Sports (Skate/Tony Hawk/Session/BMX): Focus on the skater in mid-air trick (kickflip/grind/grab) over stairs or rail, low-angle fisheye perspective, flying skateboard, motion blur, gritty skatepark lighting. "
            "   - If Combat Sports/Wrestling/Fighting (WWE/UFC/Tekken/Street Fighter): Focus on the dramatic finisher, high-flying body slam or knockout punch, intense facial expressions, ring floodlights, crowd in bokeh blur, sweat/impact particles. "
            "   - If Sports/Football (FIFA/PES/eFootball/FC): Focus on the hero player mid-action, dynamic ball with motion blur, intense facial expression, stadium floodlights, grass turf particles, electric packed stadium. "
            "   - If Racing/Vehicles: Focus on the hero vehicle in extreme dynamic perspective, body damage, flying sparks, tyre smoke, cinematic reflections. "
            "   - If Shooter/Action/RPG: Focus on the protagonist, hero weapon, glowing abilities, menacing boss/enemy, cinematic depth of field. "
            "   - If other/Vlog/IRL: Focus on the central human hero expression or storytelling focal object with maximum visual punch. "
            "2. Craft an English visual prompt for an image generator (like FLUX/Midjourney) that captures this moment with maximum click-through rate (CTR): "
            "   - Composition: ONE dominant focal hero element in the foreground that pops immediately on a mobile screen. Low-angle Dutch tilt or dynamic action camera angle. "
            "   - Lighting & Color: High contrast, vivid saturated colors (e.g. fiery amber/gold against deep cinematic teal/blue), volumetric light rays, dramatic rim lighting. "
            "   - Action & Details: High-speed motion blur, particles, debris, cinematic depth of field. "
            "   - STRICT RULE: DO NOT include any text, typography, letters, subtitles, watermarks, UI, or logos in the prompt. "
            "Output ONLY the descriptive visual prompt in English (around 50-80 words)."
        )
    else:
        instruction = (
            "You are an award-winning YouTube Thumbnail Creative Director & AI Prompt Artist. "
            "Based on the video title, description, and creator's prompt, determine the game and exact scene. "
            "Craft an English visual prompt for an image generator (like FLUX/Midjourney) for a viral, high-CTR gaming thumbnail: "
            "ONE dominant focal hero character/vehicle/element in the foreground that pops on mobile screens, dynamic low-angle perspective, high contrast, vivid cinematic lighting (orange & teal / neon rim lighting), volumetric atmosphere, 8k resolution. "
            "STRICT RULE: DO NOT include any text, typography, letters, subtitles, watermarks, UI, or logos in the prompt. "
            "Output ONLY the visual prompt in English (around 50-80 words)."
        )

    user_context = f"Video Title: {title}\nUser prompt/voice note: {user_prompt or 'None'}\nVideo Description/Context: {description[:500] if description else 'None'}\nFormat: {'Vertical Short 9:16' if is_shorts else 'Horizontal 16:9'}"

    parts = [{"text": instruction + "\n\n" + user_context}]

    # Attach actual video frames for Gemini Multimodal Vision
    if valid_frames:
        for idx, fp in enumerate(valid_frames):
            try:
                with open(fp, "rb") as f:
                    b64 = base64.b64encode(f.read()).decode("utf-8")
                parts.append({"text": f"--- Gameplay Frame {idx + 1} ---"})
                parts.append({
                    "inline_data": {
                        "mime_type": "image/jpeg",
                        "data": b64
                    }
                })
            except Exception as e:
                logger.warning(f"Error reading frame {fp} for visual prompt: {e}")

    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {"temperature": 0.6}
    }

    for model in get_model_cascade(get_active_text_model()):
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode('utf-8'),
                headers={'Content-Type': 'application/json'}
            )
            resp = urllib.request.urlopen(req, timeout=15)
            if resp.status == 200:
                data = json.loads(resp.read().decode('utf-8'))
                res_text = data['candidates'][0]['content']['parts'][0]['text'].strip()
                res_text = re.sub(r'^(Prompt:\s*|Visual prompt:\s*|["\'])', '', res_text)
                res_text = re.sub(r'["\']$', '', res_text).strip()

                usage_meta = data.get('usageMetadata', {})
                prompt_tokens = usage_meta.get('promptTokenCount', 0)
                candidates_tokens = usage_meta.get('candidatesTokenCount', 0)
                total_tokens = usage_meta.get('totalTokenCount', prompt_tokens + candidates_tokens)
                database.log_ai_usage("thumbnail_prompt_vision", model, prompt_tokens, candidates_tokens, total_tokens)

                logger.info(f"Gemini Vision crafted visual prompt from {len(valid_frames)} frames: {res_text}")
                return res_text
        except Exception as e:
            logger.warning(f"Failed to craft prompt with {model}: {e}")
            continue

    return f"Hyper-dramatic cinematic YouTube gaming thumbnail for {title}, action-packed dynamic perspective, vivid saturated colors, volumetric rim lighting, 8k resolution"


def generate_thumbnail_image(
    title: str,
    description: Optional[str] = None,
    user_prompt: Optional[str] = None,
    is_shorts: bool = False,
    style: Optional[str] = "cinematic",
    frame_paths: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Generates a YouTube thumbnail image (1280x720 for regular or 720x1280 for Shorts).
    First synthesizes an optimized prompt with Gemini Vision from actual frames and context, then generates the image.
    Saves the file to cache/thumbs/ and returns candidate details.
    """
    os.makedirs(THUMB_CACHE, exist_ok=True)
    visual_prompt = craft_thumbnail_prompt(title, description=description, user_prompt=user_prompt, is_shorts=is_shorts, frame_paths=frame_paths)

    width = 720 if is_shorts else 1280
    height = 1280 if is_shorts else 720

    api_key = get_api_key()
    image_bytes = None
    engine_used = "flux"

    # 1. Try Gemini Image generation if available on account
    if api_key:
        image_models = ['gemini-2.5-flash-image', 'imagen-3.0-generate-002']
        for im_model in image_models:
            try:
                g_url = f"https://generativelanguage.googleapis.com/v1beta/models/{im_model}:generateContent?key={api_key}"
                g_payload = {
                    "contents": [{"parts": [{"text": visual_prompt}]}],
                    "generationConfig": {"responseModalities": ["IMAGE"]}
                }
                g_req = urllib.request.Request(
                    g_url,
                    data=json.dumps(g_payload).encode('utf-8'),
                    headers={'Content-Type': 'application/json'}
                )
                g_resp = urllib.request.urlopen(g_req, timeout=25)
                if g_resp.status == 200:
                    g_data = json.loads(g_resp.read().decode('utf-8'))
                    parts = g_data.get('candidates', [{}])[0].get('content', {}).get('parts', [])
                    for p in parts:
                        if 'inlineData' in p and p['inlineData'].get('data'):
                            image_bytes = base64.b64decode(p['inlineData']['data'])
                            engine_used = f"gemini ({im_model})"
                            break
                    if image_bytes:
                        break
            except Exception as ge:
                logger.info(f"Gemini image generation ({im_model}) not available: {ge}")
                continue

    # 2. High-quality FLUX/SDXL fallback engine with quality boosters
    if not image_bytes:
        seed = int(time.time() * 1000) % 1000000
        flux_prompt = f"{visual_prompt}, hyper-detailed, Unreal Engine 5 render, cinematic lighting, 8k resolution, photorealistic, sharp focus, masterpiece"
        enc_prompt = urllib.parse.quote(flux_prompt)
        p_url = f"https://image.pollinations.ai/prompt/{enc_prompt}?width={width}&height={height}&model=flux&nologo=true&seed={seed}"

        logger.info(f"Generating thumbnail via {p_url[:80]}...")
        req = urllib.request.Request(p_url, headers={'User-Agent': 'Mozilla/5.0'})
        try:
            resp = urllib.request.urlopen(req, timeout=45)
            if resp.status == 200:
                image_bytes = resp.read()
                engine_used = "flux"
        except Exception as pe:
            logger.warning(f"FLUX generation failed: {pe}, trying fast model...")
            fast_url = f"https://image.pollinations.ai/prompt/{enc_prompt}?width={width}&height={height}&nologo=true&seed={seed}"
            fast_req = urllib.request.Request(fast_url, headers={'User-Agent': 'Mozilla/5.0'})
            resp = urllib.request.urlopen(fast_req, timeout=30)
            image_bytes = resp.read()
            engine_used = "sdxl"

    if not image_bytes:
        raise RuntimeError("Не вдалося згенерувати обкладинку. Спробуйте ще раз.")

    timestamp = int(time.time() * 1000)
    filename = f"ai_thumb_{timestamp}.jpg"
    thumb_path = os.path.join(THUMB_CACHE, filename).replace('\\', '/')

    with open(thumb_path, 'wb') as f:
        f.write(image_bytes)

    logger.info(f"Successfully saved AI thumbnail to {thumb_path} ({len(image_bytes)} bytes, engine={engine_used})")

    candidate = {
        "timestamp": -1,
        "formatted": "ШІ Генерація",
        "thumb_url": f"/api/thumbnail?path={urllib.parse.quote(thumb_path)}",
        "thumb_path": thumb_path,
        "is_ai_generated": True,
        "prompt_used": visual_prompt,
        "engine": engine_used
    }

    return {
        "success": True,
        "candidate": candidate,
        "thumb_path": thumb_path,
        "prompt_used": visual_prompt,
        "engine": engine_used
    }



