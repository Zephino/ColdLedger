@echo off
setlocal
cd /d "%~dp0"

set "MODE=%~1"
if "%MODE%"=="" set "MODE=browser"

where node >nul 2>&1
if errorlevel 1 (
  echo Missing Node.js. Install Node.js 20+ from https://nodejs.org/ then run this again.
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo Missing npm. Reinstall Node.js from https://nodejs.org/ then run this again.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Installing dependencies ^(npm ci^)...
  call npm ci
  if errorlevel 1 (
    echo Dependency install failed.
    pause
    exit /b 1
  )
)

if /i "%MODE%"=="browser" goto browser
if /i "%MODE%"=="dev" goto browser
if /i "%MODE%"=="desktop" goto desktop
if /i "%MODE%"=="portable" goto portable
if /i "%MODE%"=="dist" goto portable
if /i "%MODE%"=="exe" goto portable

echo Unknown mode: %MODE%
echo Usage: play.bat [browser^|desktop^|portable]
pause
exit /b 1

:browser
echo Starting Cold Ledger in the browser...
echo Keep this window open while you play. Close it or press Ctrl+C to stop.
echo The title screen should say "Cold Ledger". If you see a black page with
echo other text, you are not on the game — close that tab and use this window's URL.
call npm run dev -- --host 127.0.0.1 --port 5173 --strictPort --open
pause
exit /b %ERRORLEVEL%

:desktop
echo Building and launching the desktop window...
call npm run desktop
pause
exit /b %ERRORLEVEL%

:portable
echo Building a portable Windows executable under release\...
call npm run dist:win
if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)
echo Done. Look in: %CD%\release\
pause
exit /b 0
