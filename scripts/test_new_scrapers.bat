@echo off
title Test - Indxx + Global Indices

cd /d "%~dp0\.."

chcp 65001 >nul
set PYTHONIOENCODING=utf-8

echo ============================================================
echo   Testing new scrapers (Indxx + yfinance)
echo ============================================================
echo.

echo [1/2] Indxx 13F Index...
echo ------------------------------------------------------------
python scripts\indxx_returns.py
echo.

echo [2/2] Global indices (yfinance)...
echo ------------------------------------------------------------
python scripts\global_returns.py
echo.

echo ============================================================
echo   Done. Check docs\data\indxx_13f.json
echo                docs\data\global_indices.json
echo ============================================================
pause
