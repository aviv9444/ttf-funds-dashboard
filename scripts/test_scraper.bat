@echo off
title TTF Dashboard - Test scraper only

REM ===========================================================
REM   Run the Python scraper only - no git operations.
REM   Use this for the first test run.
REM ===========================================================

cd /d "%~dp0\.."

chcp 65001 >nul
set PYTHONIOENCODING=utf-8

echo ============================================================
echo   Running scraper only (no git push)
echo ============================================================
echo.

python scripts\ttf_returns.py

echo.
echo ============================================================
echo   Done. Check data\funds.json
echo ============================================================
pause
