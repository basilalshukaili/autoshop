@echo off
title AutoShop Pro - Garage Management Platform
echo.
echo  ====================================================
echo   AutoShop Pro - Powered by Basil Al Shukaili
echo   Starting server... open http://localhost:3000
echo  ====================================================
echo.
cd /d "%~dp0server"
node --no-warnings index.js
pause
