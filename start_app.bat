@echo off
chcp 65001 >nul
cd /d "%~dp0"
title YouTube Studio Launcher

python run_studio.py
if %errorlevel% neq 0 (
    echo.
    echo ===================================================
    echo  Помилка виконання run_studio.py!
    echo ===================================================
    pause
)
