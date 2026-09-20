import os
import sys

# Force UTF-8 stdout/stderr with replacement on Windows console
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

import time
import socket
import traceback
import subprocess
import webbrowser
import urllib.request

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
WEB_APP_DIR = os.path.join(BASE_DIR, "web_app")

def is_port_in_use(port: int) -> bool:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.5)
            return s.connect_ex(('127.0.0.1', port)) == 0
    except Exception:
        return False

def kill_port(port: int):
    try:
        cmd = f'netstat -ano | findstr :{port}'
        output = subprocess.check_output(cmd, shell=True, text=True)
        for line in output.strip().splitlines():
            parts = line.split()
            if len(parts) >= 5 and f":{port}" in parts[1]:
                pid = parts[-1]
                if pid and pid != "0":
                    subprocess.run(f'taskkill /F /PID {pid}', shell=True, capture_output=True)
    except Exception:
        pass

def check_and_rebuild_frontend():
    next_dir = os.path.join(FRONTEND_DIR, ".next")
    src_dir = os.path.join(FRONTEND_DIR, "src")
    
    rebuild = False
    if not os.path.exists(next_dir):
        rebuild = True
    elif os.path.exists(src_dir):
        next_mtime = os.path.getmtime(next_dir)
        for root, _, files in os.walk(src_dir):
            for f in files:
                if f.endswith(('.ts', '.tsx', '.js', '.jsx', '.css', '.json')):
                    try:
                        if os.path.getmtime(os.path.join(root, f)) > next_mtime:
                            rebuild = True
                            break
                    except Exception:
                        pass
            if rebuild:
                break

    if rebuild:
        print("[Оновлення] Виявлено зміни у файлах! Перезбірка фронтенду (npm run build)...")
        if is_port_in_use(3000):
            kill_port(3000)
            time.sleep(1)
        res = subprocess.run("npm run build", shell=True, cwd=FRONTEND_DIR)
        if res.returncode == 0:
            print("[Оновлення] Фронтенд успішно оновлено!\n")
        else:
            print("[Попередження] Помилка збірки фронтенду, спроба запуску попередньої версії...\n")

def start_backend():
    if is_port_in_use(8000):
        print("[1/2] Backend сервер вже активний (порт 8000).")
        return

    print("[1/2] Запуск Backend сервера (FastAPI)...")
    cmd = 'start "YouTube Studio Backend" /min python server.py'
    subprocess.Popen(cmd, shell=True, cwd=WEB_APP_DIR)

def start_frontend():
    if is_port_in_use(3000):
        print("[2/2] Frontend інтерфейс вже активний (порт 3000).")
        return

    print("[2/2] Запуск Frontend інтерфейсу (Next.js)...")
    cmd = 'start "YouTube Studio Frontend" /min npx next start -p 3000'
    subprocess.Popen(cmd, shell=True, cwd=FRONTEND_DIR)

def wait_and_open_browser():
    print("\nПідключення до студії (http://localhost:3000)...")
    ready = False
    for _ in range(30):
        try:
            req = urllib.request.Request("http://127.0.0.1:3000", headers={'User-Agent': 'StudioLauncher'})
            with urllib.request.urlopen(req, timeout=1.0) as resp:
                if resp.getcode() == 200:
                    ready = True
                    break
        except Exception:
            time.sleep(0.8)

    if ready:
        print("[OK] Студія готова! Відкриття браузера...")
    else:
        print("Час очікування минув, відкриття браузера...")

    try:
        webbrowser.open("http://localhost:3000")
    except Exception as e:
        print(f"Помилка відкриття браузера: {e}")

def main():
    print("=" * 55)
    print("        YouTube Shorts & Video Automation Studio")
    print("=" * 55)
    print()

    try:
        # 1. Check for changes and rebuild if needed
        check_and_rebuild_frontend()

        # 2. Start backend
        start_backend()

        # 3. Start frontend
        start_frontend()

        # 4. Wait for server and open browser
        wait_and_open_browser()

        print()
        print("=" * 55)
        print(" Студія успішно запущена: http://localhost:3000")
        print(" Вікно закриється автоматично через 3 секунди...")
        print("=" * 55)
        time.sleep(3)

    except Exception as e:
        print(f"\n[ПОМИЛКА ЗАПУСКУ] {e}")
        traceback.print_exc()
        input("\nНатисніть Enter, щоб закрити це вікно...")

if __name__ == "__main__":
    main()
