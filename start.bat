@echo off
title Side Quest System of Life

set PYTHON="C:\Users\deng\AppData\Local\Programs\Python\Python312\python.exe"

echo ============================================
echo  Side Quest System of Life - Quick Start
echo ============================================

echo.
echo [1/2] Installing deps + Starting Backend (port 8000)...

start "" cmd /c "title Backend & cd /d %~dp0backend & %PYTHON% -m pip install -r requirements.txt -q >nul 2>&1 & echo [Backend] Dependencies OK & %PYTHON% -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

ping -n 5 127.0.0.1 >nul

echo [2/2] Killing old Next.js, then starting Frontend (port 3000)...

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 "') do (
    taskkill /f /pid %%a >nul 2>&1
)
ping -n 2 127.0.0.1 >nul

start "" cmd /c "title Frontend & cd /d %~dp0frontend & npm run dev"

echo.
echo ============================================
echo  Backend:  http://localhost:8000
echo  Health:   http://localhost:8000/api/health
echo  Frontend: http://localhost:3000
echo ============================================
echo.
echo Close each service window to stop.
pause