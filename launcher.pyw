import os
import sys
import time
import socket
import logging
import subprocess
import webbrowser
import urllib.request

# Setup logging in project directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_FILE = os.path.join(BASE_DIR, "launcher.log")
logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    encoding="utf-8"
)

def log(msg: str):
    logging.info(msg)

def is_port_in_use(port: int) -> bool:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.6)
            return s.connect_ex(('127.0.0.1', port)) == 0
    except Exception:
        return False

def kill_process_on_port(port: int):
    try:
        cmd = f'netstat -ano | findstr :{port}'
        output = subprocess.check_output(cmd, shell=True, text=True)
        for line in output.strip().splitlines():
            parts = line.split()
            if len(parts) >= 5 and f":{port}" in parts[1]:
                pid = parts[-1]
                if pid and pid != "0":
                    subprocess.run(f'taskkill /F /PID {pid}', shell=True, capture_output=True)
                    log(f"Killed process PID {pid} on port {port}")
    except Exception as e:
        log(f"Error checking/killing port {port}: {e}")

def check_frontend_needs_rebuild() -> bool:
    frontend_dir = os.path.join(BASE_DIR, "frontend")
    next_dir = os.path.join(frontend_dir, ".next")
    
    if not os.path.exists(next_dir):
        log(".next directory does not exist, rebuild needed.")
        return True

    next_mtime = os.path.getmtime(next_dir)
    src_dir = os.path.join(frontend_dir, "src")
    if not os.path.exists(src_dir):
        return False

    latest_src_mtime = 0
    for root, _, files in os.walk(src_dir):
        for f in files:
            if f.endswith(('.ts', '.tsx', '.js', '.jsx', '.css', '.json')):
                p = os.path.join(root, f)
                try:
                    m = os.path.getmtime(p)
                    if m > latest_src_mtime:
                        latest_src_mtime = m
                except Exception:
                    pass

    needs = latest_src_mtime > next_mtime
    if needs:
        log(f"Source files are newer ({latest_src_mtime} > {next_mtime}), rebuild needed.")
    return needs

def rebuild_frontend():
    frontend_dir = os.path.join(BASE_DIR, "frontend")
    log("Building frontend with npm run build...")
    # If Next.js is running on 3000, stop it during build
    if is_port_in_use(3000):
        kill_process_on_port(3000)
        time.sleep(1)

    result = subprocess.run(
        "npm run build",
        shell=True,
        cwd=frontend_dir,
        capture_output=True,
        text=True,
        creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, 'CREATE_NO_WINDOW') else 0
    )
    if result.returncode == 0:
        log("Frontend built successfully!")
    else:
        log(f"Frontend build warning/error:\n{result.stderr[-500:]}")

def start_backend():
    if is_port_in_use(8000):
        log("Backend is already running on port 8000.")
        return

    log("Starting FastAPI backend server...")
    # Use python.exe (not pythonw.exe) in CREATE_NO_WINDOW mode
    py_exe = os.path.join(os.path.dirname(sys.executable), "python.exe")
    if not os.path.exists(py_exe):
        py_exe = sys.executable

    server_script = os.path.join(BASE_DIR, "web_app", "server.py")
    subprocess.Popen(
        [py_exe, server_script],
        cwd=BASE_DIR,
        creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, 'CREATE_NO_WINDOW') else 0
    )
    log("Backend process spawned.")

def start_frontend():
    if is_port_in_use(3000):
        log("Frontend is already running on port 3000.")
        return

    log("Starting Next.js production server on port 3000...")
    frontend_dir = os.path.join(BASE_DIR, "frontend")
    subprocess.Popen(
        "npx next start -p 3000",
        shell=True,
        cwd=frontend_dir,
        creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, 'CREATE_NO_WINDOW') else 0
    )
    log("Frontend process spawned.")

def wait_for_service(url: str, timeout_sec: int = 20) -> bool:
    start_t = time.time()
    while time.time() - start_t < timeout_sec:
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Launcher'})
            with urllib.request.urlopen(req, timeout=1.5) as resp:
                if resp.getcode() == 200:
                    return True
        except Exception:
            time.sleep(0.5)
    return False

def main():
    log("=== Launcher started ===")
    
    # 1. Check if source files were modified, rebuild if so
    if check_frontend_needs_rebuild():
        rebuild_frontend()

    # 2. Start Backend
    start_backend()

    # 3. Start Frontend
    start_frontend()

    # 4. Wait for frontend to be fully ready
    log("Waiting for http://localhost:3000...")
    ready = wait_for_service("http://127.0.0.1:3000", timeout_sec=20)
    if ready:
        log("Application is ready! Opening default browser...")
    else:
        log("Timeout waiting for 3000, opening browser anyway...")

    # 5. Open browser
    webbrowser.open("http://localhost:3000")
    log("=== Launcher finished successfully ===")

if __name__ == "__main__":
    main()
