@echo off
title TTF Dashboard - Install dependencies

cd /d "%~dp0"

echo ============================================================
echo   Installing Python dependencies
echo ============================================================
echo.

python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found in PATH.
    echo Install from: https://www.python.org/downloads/
    pause
    exit /b 1
)

pip install -r requirements.txt
echo.
echo Done.
pause
