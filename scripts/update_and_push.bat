@echo off
setlocal enabledelayedexpansion
title TTF Dashboard - Daily Update

REM ===========================================================
REM   TTF Dashboard - Daily update script
REM   Runs all 3 scrapers, commits new JSON files, pushes to git.
REM ===========================================================

cd /d "%~dp0\.."

set LOG=scripts\last_run.log

echo. > %LOG%
echo ============================================================ >> %LOG%
echo Run started: %DATE% %TIME% >> %LOG%
echo ============================================================ >> %LOG%

chcp 65001 >nul
set PYTHONIOENCODING=utf-8

REM --- Step 1: Tachlit funds (Bizportal) -----------------------------------
echo. >> %LOG%
echo [1/4] Fetching Tachlit funds from Bizportal... >> %LOG%
echo ------------------------------------------------------------ >> %LOG%
python scripts\ttf_returns.py >> %LOG% 2>&1
if errorlevel 1 (
    echo [WARN] Tachlit scraper failed - continuing with other sources. >> %LOG%
)

REM --- Step 2: Indxx 13F Index ---------------------------------------------
echo. >> %LOG%
echo [2/4] Fetching Indxx 13F Index... >> %LOG%
echo ------------------------------------------------------------ >> %LOG%
python scripts\indxx_returns.py >> %LOG% 2>&1
if errorlevel 1 (
    echo [WARN] Indxx scraper failed - continuing. >> %LOG%
)

REM --- Step 3: Global indices (yfinance) -----------------------------------
echo. >> %LOG%
echo [3/4] Fetching global indices from yfinance... >> %LOG%
echo ------------------------------------------------------------ >> %LOG%
python scripts\global_returns.py >> %LOG% 2>&1
if errorlevel 1 (
    echo [WARN] Global indices scraper failed - continuing. >> %LOG%
)

REM --- Step 4: Commit and push ---------------------------------------------
echo. >> %LOG%
echo [4/4] Checking for changes... >> %LOG%
echo ------------------------------------------------------------ >> %LOG%

git diff --quiet docs/data/
if not errorlevel 1 (
    echo No changes detected - nothing to commit. >> %LOG%
    goto :end
)

echo Committing and pushing... >> %LOG%
git add docs/data/ >> %LOG% 2>&1

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

if "%1" neq "/silent" (
    type %LOG%
    pause
)

endlocal
