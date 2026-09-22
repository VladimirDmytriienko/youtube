import os
import re
import json
import time
import base64
import asyncio
import logging
import tempfile
import subprocess
import urllib.request
import concurrent.futures
from typing import Dict, Any, List, Optional
import ai_assistant
import database
import video_processor
import video_outro

from core.ai_models import get_active_vision_model, get_active_text_model, get_model_cascade

logger = logging.getLogger("AIVideoAnalyst")

def clean_json_text(raw_text: str) -> str:
    """Cleans markdown fences, trailing commas, and returns clean JSON string."""
    cleaned = re.sub(r'^```(?:json)?\s*', '', raw_text.strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r'\s*```$', '', cleaned.strip())
    # Remove trailing commas before } or ]
    cleaned = re.sub(r',\s*([\]}])', r'\1', cleaned)
    return cleaned

def get_video_duration(video_path: str) -> float:
    """Uses ffprobe to obtain exact video duration in seconds."""
    cmd = [
        'ffprobe', '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        video_path
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0 or not res.stdout.strip():
        raise RuntimeError(f"Не вдалося отримати тривалість відео: {res.stderr}")
    return float(res.stdout.strip())

def analyze_video_timeline(
    video_path: str,
    user_prompt: Optional[str] = None,
    target_samples: int = 40
) -> Dict[str, Any]:
    """
    STAGE 1: Google Gemini Multimodal Video Analyzer.
    Samples lightweight chronological frames from the video with exact timecodes in parallel,
    and analyzes key moments, crashes, highlights, and overall narrative flow.
    Optimized for long 15-20+ minute videos via parallel ThreadPoolExecutor frame extraction.
    """
    api_key = ai_assistant.get_api_key()
    if not api_key:
        raise RuntimeError("Gemini API ключ не налаштовано.")

    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Відеофайл не знайдено: {video_path}")

    duration = get_video_duration(video_path)
    if duration <= 0:
        raise RuntimeError("Некоректна тривалість відео.")

    # Adaptive sample density for short, medium, and long 15-20+ min videos
    if duration <= 120:
        optimal_samples = min(35, max(18, target_samples))
    elif duration <= 600:
        optimal_samples = min(60, max(30, target_samples))
    else:
        # Long video (10-25+ minutes): sample 55 to 80 frames
        optimal_samples = min(80, max(50, target_samples))

    interval = max(2.0, duration / float(optimal_samples))

    sample_times = []
    curr = 1.0
    while curr < duration - 1.0:
        sample_times.append(round(curr, 2))
        curr += interval

    temp_dir = tempfile.mkdtemp(prefix="gemini_analysis_")
    t_start = time.time()

    # Parallel frame extraction using ThreadPoolExecutor
    def extract_single_frame(t: float):
        m = int(t // 60)
        s = int(t % 60)
        time_str = f"{m:02d}:{s:02d}"
        frame_file = os.path.join(temp_dir, f"frame_{int(t*100):06d}.jpg")
        f_cmd = [
            'ffmpeg', '-y', '-ss', str(t), '-i', video_path,
            '-vframes', '1', '-vf', 'scale=640:360', '-q:v', '4', frame_file
        ]
        subprocess.run(f_cmd, capture_output=True)
        if os.path.exists(frame_file):
            try:
                with open(frame_file, 'rb') as f:
                    b64 = base64.b64encode(f.read()).decode('utf-8')
                os.remove(frame_file)
                return (t, time_str, b64)
            except Exception as fe:
                logger.warning(f"Error reading sample frame {frame_file}: {fe}")
        return None

    logger.info(f"Extracting {len(sample_times)} frames in parallel (duration: {duration:.1f}s)...")
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        extracted = list(executor.map(extract_single_frame, sample_times))

    logger.info(f"Parallel frame extraction completed in {time.time() - t_start:.2f}s")

    try:
        os.rmdir(temp_dir)
    except Exception:
        pass

    parts = []

    instruction = """You are an elite YouTube Video Director & Multimodal AI Analyst.
You are given a rich chronological sequence of video frames extracted from a source video with exact timestamps.
Carefully analyze the timeline from start to finish.

YOUR MISSION (STAGE 1 - MULTIMODAL TIMELINE BREAKDOWN):
1. Detect Subject, Genre & Environment:
   Accurately identify what is happening in the video (e.g. Gaming, Skateboarding, Motorsport/Racing, Combat Sports, IRL, Extreme Sports, Tech, etc.), the setting/environment, and the primary subjects or players.

2. Identify Chronological Key Micro-Moments, Action Sequences & Narrative Beats:
   Find all significant high-energy, dramatic, clutch, or comical moments across the entire video.
   
   STRICT DEAD AIR EXCLUSION RULE:
   Completely IGNORE and EXCLUDE static menus, loading screens, respawn countdowns, pause screens, and uneventful driving/walking in a straight line with zero tension or competition!

   For each moment, specify:
   - "start_sec": float start timestamp (start 1-2s before action initiates for instant hook)
   - "end_sec": float end timestamp (end 1s after reaction/aftermath settles; tight, high-impact slice 4 to 28s)
   - "title": punchy, descriptive headline of the action
   - "intensity": score from 1.0 to 10.0 of visual excitement/impact
   - "type": "highlight" | "skill" | "fail" | "clutch" | "humor" | "climax" | "buildup"
   - "cluster_id": identifier of the action event or run it belongs to (e.g. "Race 1", "Stunt Session A", "Final Lap Battle")
   - "beat": "hook" | "buildup" | "climax" | "payoff" | "solo_highlight"
   - "details": 1-2 sentence breakdown of the visual action and what makes it compelling

3. "summary": A concise 2-3 sentence overview describing the overall video arc, tone, and pacing.

Return STRICT JSON matching this structure:
{
  "detected_game": "...",
  "summary": "...",
  "timeline_events": [
    {
      "start_sec": 12.0,
      "end_sec": 24.5,
      "title": "...",
      "intensity": 9.2,
      "type": "skill",
      "cluster_id": "Race 1",
      "beat": "climax",
      "details": "..."
    }
  ]
}
"""

    user_note = f"\nVideo Duration: {duration:.1f}s. User Guidance/Prompt: '{user_prompt.strip()}'" if user_prompt else f"\nVideo Duration: {duration:.1f}s."
    parts.append({"text": instruction + user_note})

    for item in extracted:
        if item:
            t, time_str, b64 = item
            parts.append({"text": f"--- Frame at {time_str} ({t:.1f}s) ---"})
            parts.append({
                "inline_data": {
                    "mime_type": "image/jpeg",
                    "data": b64
                }
            })

    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "response_mime_type": "application/json",
            "temperature": 0.3
        }
    }

    last_error = "Всі моделі Gemini недоступні для аналізу відео."
    for model in get_model_cascade(get_active_vision_model()):
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode('utf-8'),
                headers={'Content-Type': 'application/json'}
            )
            resp = urllib.request.urlopen(req, timeout=45)
            if resp.status == 200:
                data = json.loads(resp.read().decode('utf-8'))
                raw_text = data['candidates'][0]['content']['parts'][0]['text']
                cleaned = clean_json_text(raw_text)
                parsed = json.loads(cleaned)
                parsed["duration_sec"] = duration
                parsed["source_video"] = video_path

                # Log usage
                usage_meta = data.get('usageMetadata', {})
                prompt_tokens = usage_meta.get('promptTokenCount', 0)
                candidates_tokens = usage_meta.get('candidatesTokenCount', 0)
                total_tokens = usage_meta.get('totalTokenCount', prompt_tokens + candidates_tokens)
                database.log_ai_usage("video_timeline_analysis", model, prompt_tokens, candidates_tokens, total_tokens)

                logger.info(f"Video timeline analyzed successfully with {model}, events: {len(parsed.get('timeline_events', []))}")
                return parsed
        except Exception as e:
            logger.warning(f"Video analysis with {model} failed: {e}")
            last_error = str(e)
            continue

    raise RuntimeError(f"Помилка аналізу відео через Gemini: {last_error}")


def plan_shorts_strategy(
    timeline_data: Dict[str, Any],
    user_prompt: Optional[str] = None,
    language: str = "en",
    target_count: int = 5,
    scenario_preset: str = "diverse_mix"
) -> Dict[str, Any]:
    """
    STAGE 2: YouTube Shorts Strategist & Executive Producer AI.
    Generates an optimized multi-shorts package (up to 5+ distinct shorts) from the timeline.
    Supports preset scenario angles:
    - 'diverse_mix': 5 distinct angles (Top Crash, Funny Fail, Clutch Skill, Speed/Pursuit, Climax Finish)
    - 'crashes': top destructive crashes & pileups
    - 'fails': comical mistakes & hilarious bloopers
    - 'skills': pro gameplay, clutch maneuvers & overtakes
    - 'chronological': episodic miniseries from start to finish
    """
    api_key = ai_assistant.get_api_key()
    if not api_key:
        raise RuntimeError("Gemini API ключ не налаштовано.")

    is_en = language.lower().startswith("en")
    target_lang_label = "ENGLISH" if is_en else "UKRAINIAN"

    # Presets definition in English
    preset_instructions = ""
    if scenario_preset == "diverse_mix":
        preset_instructions = f"""
PRESET STRATEGY: DIVERSE MULTI-ANGLE CAMPAIGN ({target_count} Shorts):
Deliver a masterfully balanced portfolio of {target_count} distinct Shorts, each attacking audience psychology from a different angle:
- Short 1: 🔥 THE PEAK HIGHLIGHT (Continuous 1-cut highlight, 18-35s) — The single most explosive, jaw-dropping moment of the entire video.
- Short 2: 🎬 4-BEAT NARRATIVE STORY (3-4 micro-scenes from 1 cohesive action cluster) — Hook ➡️ Escalation ➡️ Climax ➡️ Payoff.
- Short 3: 😂 CHAOS & BLOOPER (Continuous 1-cut fail/crash, 15-30s) — Unexpected wipeout, hilarious fail, or comical blunder with witty commentary.
- Short 4: ⚡ PURE SKILL / MASTERCLASS (Continuous 1-cut showcase, 18-35s) — Flawless combo, impossible reaction time, or razor-sharp execution.
- Short 5: 🧩 THEMATIC COMPILATION / COUNTDOWN (3 scenes) — Top 3 micro-moments stitched together (#3 ➡️ #2 ➡️ #1).
"""
    elif scenario_preset == "skills":
        preset_instructions = f"""
PRESET STRATEGY: PURE SKILL & MASTERCLASS ({target_count} Shorts):
Focus exclusively on peak human or player performance, razor-sharp reflexes, frame-perfect timing, and high-difficulty tricks. Create high-energy Shorts showcasing mastery, combining continuous 1-cut showcases and Top-3 skill compilations.
"""
    elif scenario_preset == "fails":
        preset_instructions = f"""
PRESET STRATEGY: CHAOS, FAILS & MEME BLOOPERS ({target_count} Shorts):
Focus on hilarious mistakes, unexpected bails, physics glitches, chaotic collisions, and comical bloopers. Include single epic fails and a "Top 3 Worst Wipeouts" compilation.
"""
    elif scenario_preset == "story_arc":
        preset_instructions = f"""
PRESET STRATEGY: 4-BEAT NARRATIVE STORY ARCS ({target_count} Shorts):
Every Short MUST follow the classic, high-retention 4-beat micro-story structure:
(Хук/Зав'язка ➡️ Ескалація темпу ➡️ Небезпечний/кульмінаційний момент ➡️ Фінал)
CRITICAL CONTEXT RULE: All 3 to 4 micro-scenes for each Short MUST originate from the SAME action cluster or sequence (the same race, round, fight, or continuous stunt run) so that the visual action, vehicle/character, and environment remain 100% coherent:
- Beat 1 (🎯 Hook / Зав'язка, 3–6s): The initial situation, high stakes, or early setback. Immediate action with zero waiting.
- Beat 2 (⚡ Escalation / Ескалація темпу, 5–8s): Rising tension, accelerating speed, narrowing gaps, pushing through traffic or obstacles.
- Beat 3 (🔥 Climax / Кульмінація & Небезпека, 6–10s): The jaw-dropping apex: insane drift, near-miss, clutch overtake, or massive crash.
- Beat 4 (🏁 Payoff / Фінал & Панчлайн, 4–6s): The victorious finish, narrow escape, or hilarious aftermath.
"""
    elif scenario_preset == "contrast":
        preset_instructions = f"""
PRESET STRATEGY: CONTRAST / EXPECTATION VS REALITY ({target_count} Shorts):
Craft Shorts based on dramatic contrast:
- Scene 1: "How I planned it..." (epic disaster, fail, or overconfidence)
- Scene 2: "How I executed it..." (clean drift, clutch recovery, or total mastery)
"""
    elif scenario_preset in ("highlights", "crashes"):
        preset_instructions = f"""
PRESET STRATEGY: TOP EXPLOSIVE SCENES & HIGHLIGHTS ({target_count} Shorts):
Focus on maximum adrenaline and jaw-dropping impact. Prioritize continuous 1-cut highlights (18-35s) so the audience experiences the full momentum, speed, and real-time tension without disorienting cuts.
"""
    elif scenario_preset == "chronological":
        preset_instructions = f"""
PRESET STRATEGY: CHRONOLOGICAL MINISERIES ({target_count} Shorts):
Organize sequential episodic chapters following the story of the video from start to finish (Act 1: The Setup, Act 2: The Battle, Act 3: The Climax).
"""
    else:
        preset_instructions = f"""
PRESET STRATEGY: VIRAL CREATOR HIGHLIGHTS ({target_count} Shorts):
Generate up to {target_count} viral, high-retention Shorts based on the timeline.
"""

    count_instruction = f"MANDATORY: You MUST generate exactly {target_count} distinct Shorts in the 'shorts' array." if target_count > 0 else "Determine the optimal number of Shorts (from 2 up to 5) based on the timeline."

    system_prompt = f"""You are a world-class YouTube Shorts Creative Director & Viral Executive Producer.
You understand modern YouTube algorithmic retention: strong 2-second hook, zero filler, rapid tempo, visual progression, and seamless narrative flow.
You work across ANY subject matter (gaming, skateboarding, racing, fighting, sports, IRL, tech, comedy, etc.).

You are given a chronological timeline breakdown of key moments extracted from the source video.
Design an elite YouTube Shorts Production Plan following the creative guidelines below.

{preset_instructions}

MANDATORY COUNT RULE:
{count_instruction}

DIRECTORIAL STRATEGY & SCENE ARCHITECTURE ("segments"):
CRITICAL QUALITY DIRECTIVES:
1. NO DISJOINTED FRANKENSTEIN CUTS:
   - For 3-4 scene narrative Shorts (Hook ➡️ Escalation ➡️ Climax ➡️ Payoff): ALL segments MUST belong to the SAME continuous action event (the same race, round, fight, or stunt attempt). DO NOT pluck random disconnected clips from across a 40-minute video! The viewer must see a coherent progression of the SAME vehicle/character/event.
   - For single-cut highlights (The Peak Highlight, Pure Skill, Epic Fail): Keep the moment AS 1 CONTINUOUS UNCUT SHOT (18–35s)! Do not chop it into fragments if the uncut action is already thrilling.

2. THE 4-BEAT NARRATIVE STRUCTURE (When creating multi-scene story Shorts):
   - Segment 1: "label": "🎯 Beat 1: Hook / Зав'язка" (3.5 to 6.0s) -> Instantly establishes the stakes or cold start.
   - Segment 2: "label": "⚡ Beat 2: Escalation / Ескалація" (5.0 to 8.0s) -> Speed increases, tension rises, near-misses.
   - Segment 3: "label": "🔥 Beat 3: Climax / Кульмінація" (6.0 to 10.0s) -> The peak stunt, crash, impossible overtake, or clutch play.
   - Segment 4: "label": "🏁 Beat 4: Payoff / Фінал" (4.0 to 6.0s) -> The finish line, recovery, funny outcome, or audience question.

3. COUNTDOWN COMPILATION STRUCTURE (When creating top-moment montages):
   - 3 micro-scenes (#3 -> #2 -> #1)
   - Segment 1: "label": "🥉 Moment #3: The Setup"
   - Segment 2: "label": "🥈 Moment #2: The Near Miss"
   - Segment 3: "label": "🥇 Moment #1: The Insane Climax"

CRITICAL DURATION RULES:
- The total duration ("duration_sec") of each Short MUST be the exact SUM of its segment durations (between 20.0 and 42.0 seconds).
- For single-cut Shorts: duration is 18.0 to 35.0 seconds.
- For 3-4 scene narrative Shorts: total duration is 22.0 to 38.0 seconds (each segment 3.5 to 9.0s).

LANGUAGE REQUIREMENT:
All user-facing text fields ("title", "badge", "hook", "rationale", "voiceover_script", "reasoning", "label") MUST be written in {target_lang_label}!

VOICEOVER SCRIPT & AUDIO SYNCHRONIZATION ({target_lang_label}):
- Tone: High-energy, captivating commentator / viral creator vibe.
- BEAT-BY-BEAT ALIGNMENT FOR 3-4 SCENE SHORTS:
  The script MUST contain exactly one punchy sentence for each segment so the spoken words match what is shown on screen in real time:
  * Sentence 1 (matches Beat 1 Hook): Hooks curiosity and introduces the challenge.
  * Sentence 2 (matches Beat 2 Escalation): Describes the mounting tension and speed.
  * Sentence 3 (matches Beat 3 Climax): High-adrenaline reaction to the crazy move/impact!
  * Sentence 4 (matches Beat 4 Payoff): Memorable punchline or call to comment/subscribe.
- WORD COUNT FORMULA:
  Target 2.4 to 2.8 words per second of total Short duration (e.g. 25-second Short = 55 to 68 words total). Never exceed 75 words! This guarantees Edge-TTS speaks with natural, clear broadcast cadence without rushing.

For each Short in "shorts":
- "id": "short_1", "short_2", ..., "short_{target_count}"
- "title": High-CTR viral title with emojis and #Shorts (max 65 chars) in {target_lang_label}
- "badge": Category badge in {target_lang_label} (e.g. "🔥 Top Moment", "⚡ Pure Skill", "😂 Epic Fail", "🏆 Comeback", "🎭 Contrast")
- "concept_type": "single_scene" | "compilation" | "story_arc" | "contrast" | "chronological"
- "segments": array of 1 to 4 micro-scenes (1 continuous scene for peak highlights; 3-4 scenes for narrative story arcs; 3 scenes for compilations)
- "start_sec": timestamp of the first segment
- "end_sec": timestamp of the last segment
- "duration_sec": total sum of segment durations
- "hook": 2-second opening hook in {target_lang_label}
- "rationale": 1-2 sentence viral strategy explanation in {target_lang_label}
- "voiceover_script": Seamless voiceover script in {target_lang_label} ready for Edge-TTS narration
- "recommended_style": "voice_and_subtitles"

Return STRICT JSON matching:
{{
  "reasoning": "Executive strategy summary in {target_lang_label}...",
  "recommended_count": {target_count},
  "shorts": [
    {{
      "id": "short_1",
      "title": "...",
      "badge": "🏆 Comeback",
      "concept_type": "story_arc",
      "segments": [
        {{
          "segment_index": 1,
          "start_sec": 14.0,
          "end_sec": 18.5,
          "duration_sec": 4.5,
          "label": "🎯 Beat 1: Hook / The Start",
          "scene_description": "Aggressive launch into the tight first corner"
        }},
        {{
          "segment_index": 2,
          "start_sec": 22.0,
          "end_sec": 28.0,
          "duration_sec": 6.0,
          "label": "⚡ Beat 2: Escalation / The Chase",
          "scene_description": "Weaving through traffic at 200 km/h with inches to spare"
        }},
        {{
          "segment_index": 3,
          "start_sec": 31.0,
          "end_sec": 39.0,
          "duration_sec": 8.0,
          "label": "🔥 Beat 3: Climax / The Near Miss",
          "scene_description": "Insane high-angle drift splitting two competitors"
        }},
        {{
          "segment_index": 4,
          "start_sec": 41.0,
          "end_sec": 46.0,
          "duration_sec": 5.0,
          "label": "🏁 Beat 4: Payoff / The Finish",
          "scene_description": "Smoking tires across the line in first place"
        }}
      ],
      "start_sec": 14.0,
      "end_sec": 46.0,
      "duration_sec": 23.5,
      "hook": "...",
      "rationale": "...",
      "voiceover_script": "...",
      "recommended_style": "voice_and_subtitles"
    }}
  ]
}}
"""

    context_text = f"VIDEO TIMELINE BREAKDOWN:\n{json.dumps(timeline_data, ensure_ascii=False)}"
    if user_prompt and user_prompt.strip():
        context_text += f"\n\nCREATOR'S PROMPT & GOAL:\n'{user_prompt.strip()}'"

    payload = {
        "contents": [{"parts": [{"text": system_prompt + "\n\n" + context_text}]}],
        "generationConfig": {
            "response_mime_type": "application/json",
            "temperature": 0.4
        }
    }

    last_error = "Всі моделі Gemini недоступні для планування Shorts."
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
                data = json.loads(resp.read().decode('utf-8'))
                raw_text = data['candidates'][0]['content']['parts'][0]['text']
                cleaned = clean_json_text(raw_text)
                parsed = json.loads(cleaned)

                # Normalize each short and its segments
                for short in parsed.get("shorts", []):
                    segs = short.get("segments")
                    if not segs or not isinstance(segs, list) or len(segs) == 0:
                        s_sec = max(0.0, float(short.get("start_sec", 0.0)))
                        e_sec = max(s_sec + 1.0, float(short.get("end_sec", s_sec + 25.0)))
                        dur = round(e_sec - s_sec, 2)
                        short["segments"] = [{
                            "segment_index": 1,
                            "start_sec": s_sec,
                            "end_sec": e_sec,
                            "duration_sec": dur,
                            "label": short.get("title", "Main Scene"),
                            "scene_description": short.get("rationale", "")
                        }]
                        short["start_sec"] = s_sec
                        short["end_sec"] = e_sec
                        short["duration_sec"] = dur
                    else:
                        norm_segs = []
                        total_dur = 0.0
                        for idx, seg in enumerate(segs, 1):
                            s_sec = max(0.0, float(seg.get("start_sec", 0.0)))
                            e_sec = max(s_sec + 1.0, float(seg.get("end_sec", s_sec + 7.0)))
                            s_dur = round(e_sec - s_sec, 2)
                            total_dur += s_dur
                            norm_segs.append({
                                "segment_index": idx,
                                "start_sec": round(s_sec, 2),
                                "end_sec": round(e_sec, 2),
                                "duration_sec": s_dur,
                                "label": str(seg.get("label", f"Scene {idx}")),
                                "scene_description": str(seg.get("scene_description", ""))
                            })
                        short["segments"] = norm_segs
                        short["start_sec"] = norm_segs[0]["start_sec"]
                        short["end_sec"] = norm_segs[-1]["end_sec"]
                        short["duration_sec"] = round(total_dur, 2)

                # Log usage
                usage_meta = data.get('usageMetadata', {})
                prompt_tokens = usage_meta.get('promptTokenCount', 0)
                candidates_tokens = usage_meta.get('candidatesTokenCount', 0)
                total_tokens = usage_meta.get('totalTokenCount', prompt_tokens + candidates_tokens)
                database.log_ai_usage("shorts_strategy_planning", model, prompt_tokens, candidates_tokens, total_tokens)

                logger.info(f"Shorts plan created successfully with {model}, count: {len(parsed.get('shorts', []))}")
                return parsed
        except Exception as e:
            logger.warning(f"Shorts planning with {model} failed: {e}")
            last_error = str(e)
            continue

    raise RuntimeError(f"Помилка створення плану Shorts через Gemini: {last_error}")


def check_audio_stream(file_path: str) -> bool:
    """Checks whether media file contains at least one audio stream."""
    try:
        cmd = [
            'ffprobe', '-v', 'error',
            '-select_streams', 'a',
            '-show_entries', 'stream=index',
            '-of', 'csv=p=0',
            file_path
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
        return bool(res.stdout.strip())
    except Exception:
        return True


def build_rich_metadata_for_short(
    safe_title: str,
    base_name: str,
    hook: Optional[str] = None,
    voiceover_script: Optional[str] = None,
    rationale: Optional[str] = None,
    detected_game: Optional[str] = None,
    badge: Optional[str] = None,
    segments: Optional[List[Dict[str, Any]]] = None,
    target_lang: str = "en"
) -> Dict[str, Any]:
    """
    Constructs comprehensive, high-retention YouTube Shorts descriptions and tags
    from already-analyzed AI game context, 2-second hook, narrator script, and scene breakdown.
    Requires 0 additional Gemini tokens and works instantaneously.
    """
    from youtube_uploader import sanitize_youtube_tag

    clean_game = detected_game.strip() if detected_game and detected_game.strip() else ""
    game_tag = sanitize_youtube_tag(clean_game) if clean_game else ""
    clean_tag_title = sanitize_youtube_tag(safe_title)

    # 1. English Description Construction
    en_hook = hook.strip() if hook and hook.strip() else f"Check out this insane highlight from {clean_game or base_name}!"
    en_story = voiceover_script.strip() if voiceover_script and voiceover_script.strip() else (rationale.strip() if rationale else f"Epic high-adrenaline sequence captured in {clean_game or base_name}.")

    en_desc_lines = [
        f"⚡ {en_hook}",
        "",
        en_story,
        ""
    ]
    if clean_game:
        en_desc_lines.append(f"🎮 Game: {clean_game}")
    if badge:
        en_desc_lines.append(f"🎬 Category: {badge}")

    if segments and len(segments) > 1:
        en_desc_lines.append("📍 Highlights & Scenes:")
        for seg in segments:
            lbl = seg.get("label") or seg.get("scene_description") or f"Scene #{seg.get('segment_index', 1)}"
            dur = seg.get('duration_sec', 0)
            en_desc_lines.append(f"• {lbl} ({dur}s)")
        en_desc_lines.append("")

    en_desc_lines.extend([
        "💬 Question of the day: What was your favorite moment here? Drop your thoughts in the comments below!",
        "🔔 Subscribe for more daily viral gaming clips, epic highlights, and Shorts!",
        "",
        f"#{game_tag or 'Gaming'} #Shorts #Highlights #Gaming #Viral #Trending"
    ])
    en_description = "\n".join(en_desc_lines)

    en_tags = ["Shorts", "Highlights", "Gaming", "Viral", "Trending"]
    if game_tag and game_tag.lower() not in [t.lower() for t in en_tags]:
        en_tags.insert(1, game_tag)
    if clean_tag_title and clean_tag_title.lower() not in [t.lower() for t in en_tags]:
        en_tags.append(clean_tag_title)

    # 2. Ukrainian Description Construction
    uk_hook = hook.strip() if hook and hook.strip() else f"Дивіться найяскравіший момент із {clean_game or base_name}!"
    uk_story = voiceover_script.strip() if voiceover_script and voiceover_script.strip() else (rationale.strip() if rationale else f"Епічний та напружений момент, зафіксований у {clean_game or base_name}.")

    uk_desc_lines = [
        f"⚡ {uk_hook}",
        "",
        uk_story,
        ""
    ]
    if clean_game:
        uk_desc_lines.append(f"🎮 Гра: {clean_game}")
    if badge:
        uk_desc_lines.append(f"🎬 Категорія: {badge}")

    if segments and len(segments) > 1:
        uk_desc_lines.append("📍 Ключові сцени ролика:")
        for seg in segments:
            lbl = seg.get("label") or seg.get("scene_description") or f"Сцена #{seg.get('segment_index', 1)}"
            dur = seg.get('duration_sec', 0)
            uk_desc_lines.append(f"• {lbl} ({dur}с)")
        uk_desc_lines.append("")

    uk_desc_lines.extend([
        "💬 Як вам цей момент? Діліться враженнями та коментуйте!",
        "🔔 Підписуйтесь на канал, щоб не пропустити свіжі щоденні випуски та Shorts!",
        "",
        f"#{game_tag or 'Геймінг'} #Shorts #Хайлайти #Відео #Геймінг #Тренди"
    ])
    uk_description = "\n".join(uk_desc_lines)

    uk_tags = ["Shorts", "Хайлайти", "Відео", "Геймінг", "Тренди"]
    if game_tag and game_tag.lower() not in [t.lower() for t in uk_tags]:
        uk_tags.insert(1, game_tag)
    if clean_tag_title and clean_tag_title.lower() not in [t.lower() for t in uk_tags]:
        uk_tags.append(clean_tag_title)

    # 3. Determine primary vs localized based on target_lang
    full_title = f"{safe_title} #Shorts"
    is_uk = target_lang.lower().startswith("uk")

    if is_uk:
        return {
            "title": full_title,
            "description": uk_description,
            "tags": uk_tags,
            "default_lang": "uk",
            "localizations": {
                "en": {
                    "title": full_title,
                    "description": en_description,
                    "tags": en_tags
                }
            }
        }
    else:
        return {
            "title": full_title,
            "description": en_description,
            "tags": en_tags,
            "default_lang": "en",
            "localizations": {
                "uk": {
                    "title": full_title,
                    "description": uk_description,
                    "tags": uk_tags
                }
            }
        }


def render_planned_short(
    source_path: str,
    start_sec: float,
    end_sec: float,
    title: str,
    segments: Optional[List[Dict[str, Any]]] = None,
    with_voiceover: bool = False,
    voiceover_script: Optional[str] = None,
    voice: str = "en-US-GuyNeural",
    zoom: float = 1.15,
    y_pos: float = 0.5,
    blur_radius: int = 25,
    dim: float = 0.18,
    with_outro: bool = False,
    outro_style: str = "youtube_animated_pills",
    outro_mode: str = "bottom_floating",
    outro_bg: str = "deep_black",
    hook: Optional[str] = None,
    rationale: Optional[str] = None,
    detected_game: Optional[str] = None,
    badge: Optional[str] = None,
    language: Optional[str] = "en"
) -> Dict[str, Any]:
    """
    HIGH-PERFORMANCE SINGLE-PASS TURBO RENDERER (SINGLE-CUT OR MULTI-SCENE COMPILATION):
    - When segments list has >1 item: slices and concatenates multiple peak micro-scenes with
      9:16 vertical blur background, foreground framing, continuous voiceover & styled ASS subtitles.
    - When single segment: executes the ultra-fast single-pass pipeline.
    """
    if not os.path.exists(source_path):
        raise FileNotFoundError(f"Файл {source_path} не знайдено.")

    source_dir = os.path.dirname(source_path)
    base_name = os.path.splitext(os.path.basename(source_path))[0]

    # Validate multi-segment list
    valid_segments: List[Dict[str, Any]] = []
    if segments and isinstance(segments, list) and len(segments) > 1:
        total_dur = 0.0
        for seg in segments:
            if not isinstance(seg, dict):
                continue
            raw_s = seg.get("start_sec")
            try:
                s_s = max(0.0, float(raw_s)) if raw_s is not None else 0.0
            except (ValueError, TypeError):
                s_s = 0.0

            raw_e = seg.get("end_sec")
            try:
                s_e = max(s_s + 0.5, float(raw_e)) if raw_e is not None else (s_s + 1.0)
            except (ValueError, TypeError):
                s_e = s_s + 1.0

            seg_dur = s_e - s_s
            if total_dur + seg_dur > 60.0:
                seg_dur = max(0.5, 60.0 - total_dur)
                s_e = s_s + seg_dur
            if seg_dur >= 0.5:
                valid_segments.append({
                    "start_sec": round(s_s, 2),
                    "end_sec": round(s_e, 2),
                    "duration_sec": round(seg_dur, 2),
                    "label": str(seg.get("label", ""))
                })
                total_dur += seg_dur
            if total_dur >= 60.0:
                break

    is_multi_segment = len(valid_segments) > 1

    if is_multi_segment:
        duration = round(sum(s["duration_sec"] for s in valid_segments), 2)
        start_t = valid_segments[0]["start_sec"]
    else:
        duration = max(1.0, min(60.0, end_sec - start_sec))
        start_t = max(0.0, start_sec)

    safe_title = re.sub(r'[\\/*?:"<>|]', "", title.replace("#Shorts", "")).strip()
    if not safe_title:
        safe_title = f"{base_name}_short"

    out_filename = f"Short - {safe_title} #Shorts.mp4"
    output_path = os.path.join(source_dir, out_filename)

    w_scaled = int(1080 * zoom)
    if w_scaled % 2 != 0:
        w_scaled += 1
    brightness_arg = -dim

    t_render_start = time.time()

    # =========================================================================
    # MULTI-SEGMENT COMPILATION PIPELINE
    # =========================================================================
    if is_multi_segment:
        has_audio = check_audio_stream(source_path)
        k_segs = len(valid_segments)

        inputs: List[str] = []
        for seg in valid_segments:
            inputs.extend(['-ss', str(seg['start_sec']), '-t', str(seg['duration_sec']), '-i', source_path])

        if with_voiceover and voiceover_script and voiceover_script.strip():
            temp_audio = os.path.join(source_dir, f"tts_{int(start_t)}_{int(time.time()*1000)}.mp3")
            temp_srt = os.path.join(source_dir, f"tts_{int(start_t)}_{int(time.time()*1000)}.srt")
            temp_ass = os.path.join(source_dir, f"tts_{int(start_t)}_{int(time.time()*1000)}.ass")

            try:
                # 1. Synthesize audio & SRT subtitles with Edge-TTS
                asyncio.run(video_processor.generate_tts_and_srt(
                    text=voiceover_script.strip(),
                    voice=voice,
                    rate_pct=10,
                    audio_out=temp_audio,
                    srt_out=temp_srt
                ))

                # 2. Convert SRT to styled ASS subtitles
                with open(temp_srt, 'r', encoding='utf-8') as sf:
                    srt_text = sf.read()
                ass_text = video_processor.srt_to_ass(srt_text, offset_sec=0.5)
                with open(temp_ass, 'w', encoding='utf-8') as af:
                    af.write(ass_text)

                ass_escaped = temp_ass.replace('\\', '/').replace(':', '\\:')
                voice_idx = k_segs
                inputs.extend(['-i', temp_audio])

                filter_parts: List[str] = []
                for idx in range(k_segs):
                    filter_parts.append(
                        f"[{idx}:v]split=2[bg{idx}_in][fg{idx}_in];"
                        f"[bg{idx}_in]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur={blur_radius}:5,eq=brightness={brightness_arg}[bg{idx}];"
                        f"[fg{idx}_in]scale={w_scaled}:-2,crop=1080:ih:(iw-1080)/2:0[fg{idx}];"
                        f"[bg{idx}][fg{idx}]overlay=0:(1920-h)*{y_pos},setpts=PTS-STARTPTS[v{idx}]"
                    )
                    if has_audio:
                        seg_dur = max(0.1, float(valid_segments[idx]['end_sec']) - float(valid_segments[idx]['start_sec']))
                        fade_out_st = max(0.0, round(seg_dur - 0.02, 3))
                        filter_parts.append(
                            f"[{idx}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,asetpts=PTS-STARTPTS,afade=t=in:ss=0:d=0.015,afade=t=out:st={fade_out_st}:d=0.015[a{idx}]"
                        )

                if has_audio:
                    concat_ins = "".join(f"[v{idx}][a{idx}]" for idx in range(k_segs))
                    filter_parts.append(f"{concat_ins}concat=n={k_segs}:v=1:a=1[v_concat][game_a]")
                    filter_parts.append(f"[v_concat]subtitles='{ass_escaped}'[vout]")
                    filter_parts.append(
                        f"[game_a]volume=0.20[game_ducked];"
                        f"[{voice_idx}:a]volume=1.15[voice_a];"
                        f"[game_ducked][voice_a]amix=inputs=2:duration=first:dropout_transition=2:normalize=0,alimiter=limit=0.95[aout]"
                    )
                else:
                    concat_ins = "".join(f"[v{idx}]" for idx in range(k_segs))
                    filter_parts.append(f"{concat_ins}concat=n={k_segs}:v=1:a=0[v_concat]")
                    filter_parts.append(f"[v_concat]subtitles='{ass_escaped}'[vout]")
                    filter_parts.append(f"[{voice_idx}:a]volume=1.0,alimiter=limit=0.95[aout]")

                cmd = [
                    'ffmpeg', '-y',
                    *inputs,
                    '-filter_complex', ';'.join(filter_parts),
                    '-map', '[vout]',
                    '-map', '[aout]',
                    '-c:v', 'libx264',
                    '-preset', 'veryfast',
                    '-crf', '20',
                    '-c:a', 'aac',
                    '-b:a', '192k',
                    output_path
                ]

                logger.info(f"Executing Multi-Segment Turbo FFmpeg render with voiceover ({k_segs} cuts): {' '.join(cmd)}")
                result = subprocess.run(cmd, capture_output=True, text=True)
                if result.returncode != 0:
                    raise RuntimeError(f"FFmpeg помилка мульти-сегментного рендеру: {result.stderr[-300:]}")

            finally:
                for tf in [temp_audio, temp_srt, temp_ass]:
                    if os.path.exists(tf):
                        try:
                            os.remove(tf)
                        except Exception:
                            pass
        else:
            # Multi-segment pure gameplay (no voiceover)
            filter_parts = []
            for idx in range(k_segs):
                filter_parts.append(
                    f"[{idx}:v]split=2[bg{idx}_in][fg{idx}_in];"
                    f"[bg{idx}_in]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur={blur_radius}:5,eq=brightness={brightness_arg}[bg{idx}];"
                    f"[fg{idx}_in]scale={w_scaled}:-2,crop=1080:ih:(iw-1080)/2:0[fg{idx}];"
                    f"[bg{idx}][fg{idx}]overlay=0:(1920-h)*{y_pos},setpts=PTS-STARTPTS[v{idx}]"
                )
                if has_audio:
                    seg_dur = max(0.1, float(valid_segments[idx]['end_sec']) - float(valid_segments[idx]['start_sec']))
                    fade_out_st = max(0.0, round(seg_dur - 0.02, 3))
                    filter_parts.append(
                        f"[{idx}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,asetpts=PTS-STARTPTS,afade=t=in:ss=0:d=0.015,afade=t=out:st={fade_out_st}:d=0.015[a{idx}]"
                    )

            if has_audio:
                concat_ins = "".join(f"[v{idx}][a{idx}]" for idx in range(k_segs))
                filter_parts.append(f"{concat_ins}concat=n={k_segs}:v=1:a=1[vout][aout]")
                cmd = [
                    'ffmpeg', '-y',
                    *inputs,
                    '-filter_complex', ';'.join(filter_parts),
                    '-map', '[vout]',
                    '-map', '[aout]',
                    '-c:v', 'libx264',
                    '-preset', 'veryfast',
                    '-crf', '20',
                    '-c:a', 'aac',
                    '-b:a', '192k',
                    output_path
                ]
            else:
                concat_ins = "".join(f"[v{idx}]" for idx in range(k_segs))
                filter_parts.append(f"{concat_ins}concat=n={k_segs}:v=1:a=0[vout]")
                cmd = [
                    'ffmpeg', '-y',
                    *inputs,
                    '-filter_complex', ';'.join(filter_parts),
                    '-map', '[vout]',
                    '-c:v', 'libx264',
                    '-preset', 'veryfast',
                    '-crf', '20',
                    output_path
                ]

            logger.info(f"Rendering multi-segment gameplay 9:16 Short ({k_segs} cuts): {' '.join(cmd)}")
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                raise RuntimeError(f"FFmpeg помилка мульти-сегментного рендеру: {result.stderr[-300:]}")

    # =========================================================================
    # SINGLE-CUT PIPELINE (BACKWARD-COMPATIBLE & ULTRA-FAST)
    # =========================================================================
    elif with_voiceover and voiceover_script and voiceover_script.strip():
        temp_audio = os.path.join(source_dir, f"tts_{int(start_t)}_{int(time.time()*1000)}.mp3")
        temp_srt = os.path.join(source_dir, f"tts_{int(start_t)}_{int(time.time()*1000)}.srt")
        temp_ass = os.path.join(source_dir, f"tts_{int(start_t)}_{int(time.time()*1000)}.ass")

        try:
            # 1. Synthesize audio & SRT subtitles with Edge-TTS
            asyncio.run(video_processor.generate_tts_and_srt(
                text=voiceover_script.strip(),
                voice=voice,
                rate_pct=10,
                audio_out=temp_audio,
                srt_out=temp_srt
            ))

            # 2. Convert SRT to styled ASS subtitles
            with open(temp_srt, 'r', encoding='utf-8') as sf:
                srt_text = sf.read()
            ass_text = video_processor.srt_to_ass(srt_text, offset_sec=0.5)
            with open(temp_ass, 'w', encoding='utf-8') as af:
                af.write(ass_text)

            # Escape path for FFmpeg subtitles filter on Windows
            ass_escaped = temp_ass.replace('\\', '/').replace(':', '\\:')

            filter_complex = (
                f"[0:v]split=2[bg_in][fg_in];"
                f"[bg_in]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur={blur_radius}:5,eq=brightness={brightness_arg}[bg];"
                f"[fg_in]scale={w_scaled}:-2,crop=1080:ih:(iw-1080)/2:0[fg];"
                f"[bg][fg]overlay=0:(1920-h)*{y_pos},subtitles='{ass_escaped}'[vout];"
                f"[0:a]volume=0.20[game_a];"
                f"[1:a]volume=1.15[voice_a];"
                f"[game_a][voice_a]amix=inputs=2:duration=first:dropout_transition=2:normalize=0,alimiter=limit=0.95[aout]"
            )

            cmd = [
                'ffmpeg', '-y',
                '-ss', str(start_t),
                '-t', str(duration),
                '-i', source_path,
                '-i', temp_audio,
                '-filter_complex', filter_complex,
                '-map', '[vout]',
                '-map', '[aout]',
                '-c:v', 'libx264',
                '-preset', 'veryfast',
                '-crf', '20',
                '-c:a', 'aac',
                '-b:a', '192k',
                output_path
            ]

            logger.info(f"Executing Turbo Single-Pass FFmpeg render: {' '.join(cmd)}")
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                raise RuntimeError(f"FFmpeg помилка рендеру: {result.stderr[-300:]}")

        finally:
            for tf in [temp_audio, temp_srt, temp_ass]:
                if os.path.exists(tf):
                    try:
                        os.remove(tf)
                    except Exception:
                        pass
    else:
        # PURE GAMEPLAY CROP (NO VOICEOVER)
        filter_complex = (
            f"[0:v]split=2[bg_in][fg_in];"
            f"[bg_in]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur={blur_radius}:5,eq=brightness={brightness_arg}[bg];"
            f"[fg_in]scale={w_scaled}:-2,crop=1080:ih:(iw-1080)/2:0[fg];"
            f"[bg][fg]overlay=0:(1920-h)*{y_pos}[vout]"
        )

        cmd = [
            'ffmpeg', '-y',
            '-ss', str(start_t),
            '-t', str(duration),
            '-i', source_path,
            '-filter_complex', filter_complex,
            '-map', '[vout]',
            '-map', '0:a:0?',
            '-c:v', 'libx264',
            '-preset', 'veryfast',
            '-crf', '20',
            '-c:a', 'aac',
            '-b:a', '192k',
            output_path
        ]

        logger.info(f"Rendering gameplay 9:16 Short: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"FFmpeg помилка рендеру: {result.stderr[-300:]}")

    logger.info(f"Short rendered in {time.time() - t_render_start:.2f}s: {output_path}")

    is_en_voice = voice.lower().startswith('en-')
    target_lang = (language or ("en" if is_en_voice else "uk")).lower()

    if with_outro:
        try:
            logger.info(f"Applying animated Like & Subscribe sticker to Short: {output_path} (lang=en)")
            video_outro.apply_outro_overlay(
                source_video=output_path,
                output_video=output_path,
                style_key=outro_style or "youtube_animated_pills",
                mode=outro_mode or "bottom_floating",
                bg_mode=outro_bg or "deep_black",
                outro_duration=2.8,
                lang="en",  # English channel content
            )
        except Exception as oe:
            logger.warning(f"Could not apply outro to short {output_path}: {oe}")

    # Register in SQLite database with rich AI-powered metadata
    norm_path = output_path.replace('\\', '/')
    rich_meta = build_rich_metadata_for_short(
        safe_title=safe_title,
        base_name=base_name,
        hook=hook,
        voiceover_script=voiceover_script,
        rationale=rationale,
        detected_game=detected_game,
        badge=badge,
        segments=valid_segments if is_multi_segment else segments,
        target_lang=target_lang
    )

    database.upsert_record(
        path=norm_path,
        filename=os.path.basename(output_path),
        title=rich_meta["title"],
        description=rich_meta["description"],
        tags=rich_meta["tags"],
        is_shorts=True,
        status="planning",
        default_lang=rich_meta["default_lang"],
        localizations=rich_meta["localizations"]
    )

    return {
        "success": True,
        "path": norm_path,
        "filename": os.path.basename(output_path),
        "title": rich_meta["title"],
        "description": rich_meta["description"],
        "tags": rich_meta["tags"],
        "default_lang": rich_meta["default_lang"],
        "localizations": rich_meta["localizations"],
        "duration": duration,
        "render_time_sec": round(time.time() - t_render_start, 2),
        "segments_count": len(valid_segments) if is_multi_segment else 1
    }
