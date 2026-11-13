@echo off
setlocal enabledelayedexpansion

REM Set PATH to include Node.js
set "PATH=C:\Program Files\nodejs;%PATH%"

REM Remove node_modules
if exist node_modules (
  echo Removing old node_modules...
  rmdir /s /q node_modules 2>nul
)

REM Install dependencies
echo Installing dependencies...
call npm install --legacy-peer-deps

if errorlevel 1 (
  echo Installation failed!
  exit /b 1
)

REM Build
echo.
echo Building React app...
call npm run build

if errorlevel 1 (
  echo Build failed!
  exit /b 1
)

echo.
echo Build complete!
echo Contents of dist folder:
dir dist
