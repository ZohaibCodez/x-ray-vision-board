@echo off
REM ============================================================
REM  XRayVision AI - local development launcher
REM
REM  Usage:
REM     run.bat          start backend + frontend
REM     run.bat fast     same, but skip AI model preloading
REM                      (much quicker start; models load on
REM                       first use. Fine for chat / diet /
REM                       language work, not for X-ray analysis)
REM
REM  Opens two windows. Close a window, or press Ctrl+C in it,
REM  to stop that server.
REM ============================================================

setlocal
title XRayVision AI - launcher

REM Always work from the folder this file lives in, so the script
REM can be double-clicked from anywhere.
cd /d "%~dp0"

echo.
echo  XRayVision AI - starting local development
echo  =========================================
echo.

REM ---------- checks ----------

where python >nul 2>&1
if errorlevel 1 (
    echo  [X] Python not found on PATH.
    echo      Install Python 3.11+ and tick "Add python.exe to PATH".
    goto :fail
)

where npm >nul 2>&1
if errorlevel 1 (
    echo  [X] npm not found on PATH.
    echo      Install Node.js from https://nodejs.org
    goto :fail
)

REM ---------- backend dependencies ----------

if not exist "backend\venv\Scripts\activate.bat" (
    echo  [1/3] Creating backend virtual environment ^(one time, ~2 min^)...
    python -m venv backend\venv
    if errorlevel 1 goto :fail
    call backend\venv\Scripts\activate.bat
    python -m pip install --upgrade pip >nul
    pip install -r backend\requirements.txt
    if errorlevel 1 goto :fail
    call deactivate
    echo        done.
) else (
    echo  [1/3] Backend virtual environment found.
)

REM ---------- frontend dependencies ----------

if not exist "node_modules" (
    echo  [2/3] Installing frontend packages ^(one time, ~2 min^)...
    call npm install
    if errorlevel 1 goto :fail
    echo        done.
) else (
    echo  [2/3] Frontend packages found.
)

REM ---------- configuration ----------

if not exist "backend\.env" (
    echo.
    echo  [!] backend\.env is missing - the backend will not start.
    echo      Copy backend\.env.example to backend\.env and fill in
    echo      SUPABASE_URL, SUPABASE_KEY, OPENROUTER_API_KEY and JWT_SECRET.
    echo.
    goto :fail
)

REM The frontend falls back to http://localhost:8000 when VITE_API_URL
REM is unset, which is exactly where the backend below listens - so a
REM missing root .env is normal and needs no action.

echo  [3/3] Starting servers...
echo.

REM ---------- launch ----------

REM cd first so the spawned windows inherit the right folder; that
REM keeps the start commands free of nested quotes, which this repo
REM needs because its path contains a space.

set "PRELOAD_NOTE=full startup (all AI models preloaded)"
if /i "%~1"=="fast" set "PRELOAD_NOTE=fast startup (models load on first use)"

REM NOTE: `set "VAR=value"` - the quotes wrap the whole assignment.
REM Writing `set VAR=true && ...` stores "true " with a trailing space,
REM which is not what the backend expects.
cd /d "%~dp0backend"
if /i "%~1"=="fast" (
    start "XRayVision Backend" cmd /k "set "DISABLE_PRELOAD=true" && call venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8000"
) else (
    start "XRayVision Backend" cmd /k "call venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8000"
)

cd /d "%~dp0"
start "XRayVision Frontend" cmd /k "npm run dev"

echo  Backend  : http://localhost:8000        (%PRELOAD_NOTE%)
echo  API docs : http://localhost:8000/docs
echo  Frontend : see the "XRayVision Frontend" window - Vite prints
echo             the address it picked (usually http://localhost:8080)
echo.
echo  Both servers run in their own windows. Close a window to stop it.
echo.
goto :done

:fail
echo.
echo  Startup aborted.
echo.
pause
exit /b 1

:done
REM Give the two windows a moment to appear before this one closes.
REM `ping` is used instead of `timeout`, which aborts with
REM "Input redirection is not supported" when the script is run
REM from another script or a CI shell rather than double-clicked.
ping -n 4 127.0.0.1 >nul
endlocal
exit /b 0
