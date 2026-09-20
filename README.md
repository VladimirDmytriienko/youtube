# 🎬 YouTube Studio Pro

> ☕ **Creator Vibe-Coding Notice:**  
> This project is 100% **pure vibe coding** made by a creator for fellow creators who want to automate the soul-crushing routine of video editing, highlight slicing, and Shorts production! 🚀  
> 
> If you've ever found yourself awake at 3 AM manually cropping 16:9 gameplay into 9:16 vertical videos, tweaking blur backgrounds, ducking audio, generating AI voiceovers, and re-typing tags and descriptions — this tool is your new superpower.  
> 
> **Real talk: don't judge the codebase too harshly.** I definitely don't vouch for pristine code quality or academic enterprise architecture — that's just how it is! 😅 It was built purely for fun, creative momentum, high-speed content delivery, and good vibes. It gets the job done, saves countless hours of editing, and that's all that matters.  
> 
> If you find this helpful, feel free to use it, share it, break it, improve it, and contribute. Pull requests, wild ideas, and feedback are always welcome! 🤝  
> 
> *Crafted with passion, caffeine, Gemini Multimodal AI, Next.js, and FFmpeg.* ✨

---

**YouTube Studio Pro** is an autonomous, full-cycle AI video workstation and Shorts compilation engine for creators. It transforms long gameplay recordings, streams, and raw footage into high-retention 9:16 YouTube Shorts, complete with multimodal scene breakdown, natural voiceover narration, styled subtitles, and scheduled publishing.

---

## 🌟 Key Features

### 🧠 Autonomous AI Director Montage Engine
- **Multimodal Timeline Analysis**: Scans video frames and audio to identify peak adrenaline moments, clutch moves, hilarious fails, and dramatic shifts.
- **Universal Director Presets**:
  - 💥 **Diverse Mix**: Balanced blend of action, humor, and climax.
  - ⚡ **Peak Skill**: Pure skill and high-speed execution.
  - 😂 **Chaos & Fails**: Funniest bloopers and unexpected moments.
  - 🏆 **Story Arc**: Zero-to-hero comeback structure.
  - 🎭 **Contrast**: Expectation vs. reality setups.
  - 🔥 **Top Highlights**: Concentrated 3–5 peak micro-scenes.
  - 🏁 **Chronological**: 3-act chronological mini-series.
- **Multi-Segment Compilation**: Slices multiple micro-scenes (5–10s each) and stitches them into a unified 9:16 Short with continuous narrative continuity.

### ⚡ Single-Pass Turbo FFmpeg Assembly
- **Blazing Fast**: Direct demuxer-level input seeking (`-ss -t -i`) decodes only required frames at **4.5x+ realtime speed** without intermediate disk files.
- **Vertical Framing**: Dynamic 9:16 Gaussian background blur + centered foreground scaling and custom Y-positioning.
- **Audio Ducking**: Gameplay audio automatically ducks to 35% during narration, letting the voiceover (135%) shine through.
- **Subtitles & Narration**: Integrates Edge-TTS neural speech (English, Ukrainian, etc.) and styled ASS subtitles.
- **Stamp Outro Overlay**: Seamless double-border Like & Subscribe CTA card in Ukrainian Native, YouTube Classic, Neon Cyan, and Minimalist White.

### 📅 Calendar & Publication Manager
- **Interactive Calendar**: Schedule and organize scheduled Shorts and long-form videos across calendar days.
- **4-Step Upload Drawer**: YouTube OAuth integration, category selection, tags, localized titles, and thumbnail customization.
- **Dynamic Model Selection**: Dual model roles (Vision & Text) supporting Gemini 2.5 Flash, 2.0 Flash, 2.5 Pro, Flash Lite, and custom experimental models with automatic fallback cascades.

---

## 📁 Clean Architecture

```
youtube-studio-pro/
├── web_app/                  # FastAPI backend
│   ├── core/                 # App configuration & dynamic AI models registry
│   ├── routers/              # Modular API routers (videos, ai, converter, youtube, outro, collage)
│   ├── ai_video_analyst.py   # English-first AI Director & FFmpeg assembly engine
│   ├── video_outro.py        # Double-border stamp outro overlay generator
│   └── database.py           # SQLite database with WAL mode & busy timeout
├── frontend/                 # Next.js 15 / React / Tailwind CSS
│   ├── src/components/       # Modular converter, studio, and player components
│   └── src/app/              # Next.js App router
├── projects/                 # 📁 DEDICATED WORKING FOLDER (100% ignored in Git)
│   ├── *.mp4                 # Raw footage, recordings, and output Shorts
│   └── [folders]/            # Project folders and scene recordings
├── launcher.pyw              # Desktop launcher
├── run_studio.py             # Server & frontend process orchestrator
├── start_app.bat             # 1-Click launcher for Windows
├── requirements.txt          # Python backend dependencies
└── .env.example              # Environment variables template
```

---

## 🚀 Getting Started

### 1. Requirements
- Python 3.10+
- Node.js 18+
- FFmpeg (added to system PATH)

### 2. Setup
```bash
# Clone the repository
git clone https://github.com/VladimirDmytriienko/youtube-studio-pro.git
cd youtube-studio-pro

# Install Python dependencies
pip install -r requirements.txt

# Install Frontend dependencies
cd frontend
npm install
cd ..

# Copy configuration template
copy .env.example .env
# Edit .env and paste your Google Gemini API key
```

### 3. Launching
Double-click `start_app.bat` or run:
```bash
python run_studio.py
```
Open **http://localhost:3000** in your browser.

Drop your raw videos into the `projects/` folder — they will immediately appear in your Library and Studio!

---

## 🤝 Contributing, Ideas & Vibe

Feel free to contribute to **YouTube Studio Pro**:
- 💡 Have an idea for a new AI Director preset or video outro design? Open an Issue or Discussion!
- 🐛 Spotted a bug or an FFmpeg edge-case? Submit a PR!
- ⭐ If this saves you hours of video editing, drop a star and share it with your fellow creator friends.

*Happy vibe coding & viral views!* 🎬🔥
