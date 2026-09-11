@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  start "The Ledger Server" cmd /k "py -m http.server 8080 --bind 127.0.0.1"
) else (
  where python >nul 2>nul
  if %errorlevel% neq 0 (
    echo Python 3 is required for the local launcher.
    echo Install Python from https://www.python.org/downloads/
    pause
    exit /b 1
  )
  start "The Ledger Server" cmd /k "python -m http.server 8080 --bind 127.0.0.1"
)
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8080/"
