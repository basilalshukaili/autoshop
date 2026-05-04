@echo off
title AutoShop Pro - First-Time Install
echo.
echo  ====================================================
echo   AutoShop Pro - Installing dependencies
echo  ====================================================
echo.
cd /d "%~dp0server"
echo [1/2] Installing server dependencies...
call npm install --no-audit --no-fund
if errorlevel 1 goto error
echo.
cd /d "%~dp0client"
echo [2/2] Installing client and building UI...
call npm install --no-audit --no-fund
if errorlevel 1 goto error
call npm run build
if errorlevel 1 goto error
echo.
echo  ====================================================
echo   Install complete. Run start.bat to launch.
echo  ====================================================
pause
exit /b 0

:error
echo.
echo  Installation failed. Check the messages above.
pause
exit /b 1
