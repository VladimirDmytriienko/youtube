import os
import subprocess

def create_desktop_shortcut():
    ps_cmd = r"""
$desktop = [Environment]::GetFolderPath('Desktop')
$ws = New-Object -ComObject WScript.Shell
$lnkPath = Join-Path $desktop "YouTube Studio.lnk"
$s = $ws.CreateShortcut($lnkPath)
$s.TargetPath = "e:\youtube\start_app.bat"
$s.WorkingDirectory = "e:\youtube"
$s.IconLocation = "e:\youtube\app_icon.ico, 0"
$s.Description = "YouTube Shorts & Video Automation Studio"
$s.Save()
Write-Output "SUCCESS: $lnkPath"
"""
    result = subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], capture_output=True, text=True)
    print("Output:", result.stdout.strip())
    if result.stderr.strip():
        print("Error:", result.stderr.strip())

if __name__ == "__main__":
    create_desktop_shortcut()

