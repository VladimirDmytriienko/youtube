@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Зупинка YouTube Studio

echo ===================================================
echo        Зупинка сервісів YouTube Studio
echo ===================================================
echo.

set STOPPED=0

for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":8000 .*LISTENING"') do (
    echo Зупинка Backend (PID %%a)...
    taskkill /F /PID %%a >nul 2>&1
    set STOPPED=1
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":3000 .*LISTENING"') do (
    echo Зупинка Frontend (PID %%a)...
    taskkill /F /PID %%a >nul 2>&1
    set STOPPED=1
)

if "%STOPPED%"=="1" (
    echo.
    echo Всі сервіси успішно зупинено!
) else (
    echo Сервери не були активні.
)

echo ===================================================
timeout /t 2 >nul
exit
