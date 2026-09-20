@echo off
title YouTube AutoStudio Launcher
echo ======================================================
echo       YouTube AutoStudio - Next.js + FastAPI
echo ======================================================
echo.

echo [1/3] Launching FastAPI Backend on http://localhost:8000 ...
start "YouTube Backend API" /min cmd /c "cd /d e:\youtube\web_app && python server.py"

echo [2/3] Launching Next.js Frontend on http://localhost:3000 ...
start "YouTube Next.js Studio" /min cmd /c "cd /d e:\youtube\frontend && npm run dev"

echo [3/3] Waiting for servers to initialize...
timeout /t 3 /nobreak >nul

echo Opening browser at http://localhost:3000 ...
start http://localhost:3000

echo.
echo Both servers are running!
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo Press any key to exit launcher (services keep running in background windows).
pause

