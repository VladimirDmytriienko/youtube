import os
import re
import asyncio
import subprocess
import edge_tts
import edge_tts.communicate

# Custom mkssml to ensure correct language tags
orig_mkssml = edge_tts.communicate.mkssml
def custom_mkssml(tc, escaped_text):
    if isinstance(escaped_text, bytes):
        escaped_text = escaped_text.decode('utf-8')
    lang = 'uk-UA' if 'uk' in tc.voice.lower() else 'en-US'
    return (
        f"<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='{lang}'>"
        f"<voice name='{tc.voice}'>"
        f"<prosody pitch='{tc.pitch}' rate='{tc.rate}' volume='{tc.volume}'>"
        f"{escaped_text}"
        "</prosody>"
        "</voice>"
        "</speak>"
    )
edge_tts.communicate.mkssml = custom_mkssml

ASS_HEADER = '''[Script Info]
Title: Auto-Generated Shorts Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: None
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: ShortsStyle,Impact,64,&H0000FFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,1,0,1,5,2,2,60,60,420,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''

def srt_to_seconds(ts):
    ts = ts.replace(',', '.')
    parts = ts.split(':')
    return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])

def sec_to_ass(s):
    h = int(s // 3600)
    m = int((s % 3600) // 60)
    sec = s % 60
    return f"{h}:{m:02d}:{sec:05.2f}"

def srt_to_ass(srt_text, offset_sec=0.0):
    blocks = srt_text.strip().split('\n\n')
    events = []
    for block in blocks:
        lines = [l.strip() for l in block.splitlines() if l.strip()]
        if len(lines) < 2:
            continue
        ts_idx = -1
        for i, l in enumerate(lines):
            if '-->' in l:
                ts_idx = i
                break
        if ts_idx == -1:
            continue
        ts_parts = lines[ts_idx].split('-->')
        t_start = max(0.0, srt_to_seconds(ts_parts[0].strip()) + offset_sec)
        t_end = max(t_start + 0.5, srt_to_seconds(ts_parts[1].strip()) + offset_sec)
        text = ' '.join(lines[ts_idx+1:])
        text = text.replace('\u0301', '').strip()
        text = re.sub(r'<[^>]+>', '', text)
        if text:
            events.append(f"Dialogue: 0,{sec_to_ass(t_start)},{sec_to_ass(t_end)},ShortsStyle,,0,0,0,,{text.upper()}")
    return ASS_HEADER + '\n'.join(events)

async def generate_tts_and_srt(text: str, voice: str, rate_pct: int, audio_out: str, srt_out: str):
    rate_str = f"+{rate_pct}%" if rate_pct >= 0 else f"{rate_pct}%"
    comm = edge_tts.Communicate(text, voice, rate=rate_str, boundary='SentenceBoundary')
    sub_maker = edge_tts.SubMaker()
    
    with open(audio_out, 'wb') as f:
        async for chunk in comm.stream():
            if chunk['type'] == 'audio':
                f.write(chunk['data'])
            elif chunk['type'] == 'SentenceBoundary':
                sub_maker.feed(chunk)
                
    srt_content = sub_maker.get_srt()
    with open(srt_out, 'w', encoding='utf-8') as f:
        f.write(srt_content)
    return srt_content

def process_video_pipeline(source_video: str, text: str, voice: str = "uk-UA-OstapNeural", rate_pct: int = 10, offset_sec: float = 0.8, voice_vol: float = 1.35, game_vol: float = 0.35, output_video: str = None):
    source_dir = os.path.dirname(source_video)
    base_name = os.path.splitext(os.path.basename(source_video))[0]
    
    work_dir = os.path.join(source_dir, "processed")
    os.makedirs(work_dir, exist_ok=True)
    
    audio_path = os.path.join(work_dir, f"{base_name}_voice.mp3")
    srt_path = os.path.join(work_dir, f"{base_name}_subtitles.srt")
    ass_path = os.path.join(work_dir, f"{base_name}_subtitles.ass")
    
    if not output_video:
        output_video = os.path.join(source_dir, f"{base_name} (AI Voice & Subtitles).mp4")
        
    # 1. Generate speech & srt
    srt_content = asyncio.run(generate_tts_and_srt(text, voice, rate_pct, audio_path, srt_path))
    
    # 2. Build ASS subtitles
    ass_content = srt_to_ass(srt_content, offset_sec=offset_sec)
    with open(ass_path, 'w', encoding='utf-8') as f:
        f.write(ass_content)
        
    # 3. FFmpeg render
    # adelay expects ms: e.g. 800ms
    delay_ms = int(offset_sec * 1000)
    if delay_ms > 0:
        audio_filter = f"[0:a:0]volume={game_vol}[a0];[1:a]adelay={delay_ms}|{delay_ms},volume={voice_vol}[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=2,alimiter=limit=0.95[aout]"
    else:
        audio_filter = f"[0:a:0]volume={game_vol}[a0];[1:a]volume={voice_vol}[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=2,alimiter=limit=0.95[aout]"
        
    # Escape colon for ass filter in ffmpeg
    ass_escaped = ass_path.replace('\\', '/').replace(':', '\\:')
    
    cmd = [
        'ffmpeg', '-y',
        '-i', source_video,
        '-i', audio_path,
        '-filter_complex', f"{audio_filter};[0:v]ass='{ass_escaped}'[vout]",
        '-map', '[vout]',
        '-map', '[aout]',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '19',
        '-c:a', 'aac',
        '-b:a', '192k',
        output_video
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg error: {result.stderr[-500:]}")
        
    return {
        "output_video": output_video,
        "audio_path": audio_path,
        "subtitles_ass": ass_path
    }
