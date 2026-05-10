@echo off
setlocal enabledelayedexpansion
title TTF Dashboard - Daily Update

REM ===========================================================
REM   TTF Dashboard - Daily update script
REM   Runs the Python scraper, commits the new JSON, pushes.
REM ===========================================================

REM Move to the repo root (one folder up from /scripts)
cd /d "%~dp0\.."

set LOG=scripts\last_run.log

echo. > %LOG%
echo ============================================================ >> %LOG%
echo Run started: %DATE% %TIME% >> %LOG%
echo ============================================================ >> %LOG%

REM Use UTF-8 console so any Hebrew prints correctly
chcp 65001 >nul
set PYTHONIOENCODING=utf-8

REM --- Step 1: Run the Python scraper ---------------------------------------
echo [1/3] Fetching fund returns... >> %LOG%
python scripts\ttf_returns.py >> %LOG% 2>&1
if errorlevel 1 (
    echo [ERROR] Python script failed. See %LOG% >> %LOG%
    goto :end
)

REM --- Step 2: Check if there is anything to commit -------------------------
echo. >> %LOG%
echo [2/3] Checking for changes... >> %LOG%
git diff --quiet data/funds.json
if not errorlevel 1 (
    echo No changes detected - nothing to commit. >> %LOG%
    goto :end
)

REM --- Step 3: Commit and push ----------------------------------------------
echo [3/3] Committing and pushing... >> %LOG%
git add data/funds.json >> %LOG% 2>&1

for /f "tokens=1-3 delims=/ " %%a in ('date /t') do set TODAY=%%c-%%b-%%a
git commit -m "Daily update - %TODAY%" >> %LOG% 2>&1
if errorlevel 1 (
    echo [ERROR] git commit failed. >> %LOG%
    goto :end
)

git push origin main >> %LOG% 2>&1
if errorlevel 1 (
    echo [ERROR] git push failed. Check credentials. >> %LOG%
    goto :end
)

echo. >> %LOG%
echo [OK] Push completed successfully. >> %LOG%

:end
echo. >> %LOG%
echo Run finished: %DATE% %TIME% >> %LOG%
echo ============================================================ >> %LOG%

REM Show log if running interactively (not via Task Scheduler)
if "%1" neq "/silent" (
    type %LOG%
    pause
)

endlocal
