@echo off
title AutoShop Pro - Manual Backup
set "STAMP=%date:/=-%_%time::=-%"
set "STAMP=%STAMP: =0%"
copy "%~dp0data\garage.db" "%~dp0backups\garage-manual-%STAMP%.db"
echo.
echo Backup saved to backups\garage-manual-%STAMP%.db
echo Tip: Sync the backups folder to Google Drive or OneDrive.
pause
