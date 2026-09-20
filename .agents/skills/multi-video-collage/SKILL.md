---
name: multi-video-collage
description: >-
  Multi-video collage and split-screen workflow to merge multiple videos (e.g. gameplay + hands-on/emulator comparison),
  stack vertically (9:16 Shorts) or side-by-side (16:9 full video), apply customizable side cropping (e.g. 10%),
  and direct post-collage AI campaigns (slicing into viral Shorts or producing a 2-3 minute full YouTube video with descriptions, timestamps, and tags).
---

# Multi-Video Montage & Content Production Workflow

This workflow enables taking multiple source videos (e.g. emulator screen recording + camera recording of a handheld console like PSP),
combining them into a professional split-screen collage, and subsequently generating both viral YouTube Shorts and complete 2-3 minute long-form YouTube comparison videos.

## 1. Split-Screen Collage Layouts

### A. Vertical Split-Screen (Shorts 9:16 - 1080x1920)
- **Top Half (1080x960)**: Video 1 (e.g. Emulator Screen)
- **Bottom Half (1080x960)**: Video 2 (e.g. Hands holding real PSP)
- **Side Cropping**: Crop 10% on left and 10% on right (`crop=iw*0.80:ih:iw*0.10:0`) before scaling to 1080x960 to preserve original aspect ratio and prevent distorted cars/devices.
- **Divider Line**: Clean 4px separator between panes.
- **Labels / Badges**: Optional top/bottom badges (`🎮 EMULATOR 60FPS` / `🕹️ REAL PSP HARDWARE`).

### B. Horizontal Split-Screen (Full Video 16:9 - 1920x1080)
- **Left Pane (960x1080)**: Source A
- **Right Pane (960x1080)**: Source B
- Ideal for 2-3 minute side-by-side comparison reviews.

### C. Audio Mixing Strategy
- `top`: Clean digital game audio from emulator.
- `bottom`: Live audio / mic commentary from phone camera.
- `mix`: Game sound (40% volume) + voice commentary (100% volume).
- `ai_voiceover`: Replace or augment with Edge-TTS dynamic narration (`en-US-GuyNeural` or `uk-UA-OstapNeural`).

---

## 2. Post-Collage Content Campaign

Once the combined video is rendered, feed it to the AI Content Director:

### Branch 1: Viral Shorts Slicing (1-3 Shorts)
- Scan the collage timeline for peak moments (e.g. simultaneous crash, graphical contrast, intense cornering).
- Generate viral title with `#Shorts`.
- 3-second retention hook.
- High-energy voiceover narration + MrBeast-style yellow Impact ASS subtitles.

### Branch 2: Full 2-3 Minute YouTube Video Package
- Full YouTube Title: Clear, high-CTR comparison title.
- Comprehensive Description (Markdown + emojis):
  - ⚡ Hook & Context (e.g. Why compare PSP with emulator in 2026).
  - ⏱️ Exact Timestamps (`0:00 Intro`, `0:45 Graphics Comparison`, `1:30 Physics & Destruction`, `2:15 FPS Test`, `2:45 Verdict`).
  - 💻 Devices & Specs breakdown (PSP model vs PC/Phone emulator settings).
  - 🔍 SEO Keywords & Related Games list.
  - 💬 Call-to-action & Question of the Day for pinned comment.
- 30+ SEO tags (under 500 characters limit).
- 16:9 AI Generated Thumbnail prompt & generation.

---

## 3. Automation Scripts
- Engine: `web_app/video_collage.py`
- Endpoints:
  - `POST /api/ai/collage/build-split`
  - `POST /api/ai/collage/produce-campaign`
