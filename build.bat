@echo off
setlocal enabledelayedexpansion

REM Set PATH to include Node.js
set "PATH=C:\Program Files\nodejs;%PATH%"

REM Build
echo Building React app...
call npm run build

if errorlevel 1 (
  echo Build failed!
  exit /b 1
)

echo.
echo Build complete!
echo Contents of dist folder:
dir /s dist
