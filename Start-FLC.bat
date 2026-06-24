@echo off
echo.
echo ================================================================
echo   FLC Attendance System - English Club VKU
echo ================================================================
echo.
echo Starting server...
echo.

cd /d "%~dp0backend"
node server.js

pause
