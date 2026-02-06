@echo off
echo ===============================
echo Stopping Arrs Docker Stack
echo ===============================

cd /d C:\Users\Jesse\Documents\Arrs

docker compose down

echo.
echo Stack stopped.
pause
