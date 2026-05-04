@echo off
title AutoShop Pro — Update
color 0A
echo.
echo  ============================================
echo   AutoShop Pro — System Update
echo  ============================================
echo.
echo  Downloading latest update...
echo.

cd /d "%~dp0"

git pull
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  [ERROR] Could not download update.
    echo  Make sure you are connected to the internet.
    echo.
    pause
    exit /b 1
)

echo.
echo  Installing dependencies...
echo.
call npm run install:all
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  [ERROR] Failed to install dependencies.
    echo.
    pause
    exit /b 1
)

echo.
echo  Building app...
echo.
call npm run build:client
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  [ERROR] Build failed.
    echo.
    pause
    exit /b 1
)

echo.
echo  Restarting server...
echo.
call pm2 restart autoshop
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  [ERROR] Could not restart server.
    echo  Try running: pm2 start ecosystem.config.cjs
    echo.
    pause
    exit /b 1
)

echo.
color 0A
echo  ============================================
echo   Update complete! Refresh your browser.
echo  ============================================
echo.
timeout /t 4 /nobreak > nul
