@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Оновлення YouTube Studio

echo ===================================================
echo          Оновлення YouTube Studio
echo ===================================================
echo.

echo [1/3] Зупинка старих фонових серверів...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":8000 .*LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":3000 .*LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo [2/3] Повна компіляція фронтенду (npm run build)...
cd /d "%~dp0frontend"
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo Помилка збірки фронтенду!
    pause
    exit /b %errorlevel%
)
cd /d "%~dp0"

echo.
echo [3/3] Запуск оновленої студії...
call start_app.bat
