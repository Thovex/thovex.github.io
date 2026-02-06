@echo off
echo ===============================
echo Starting Arrs Docker Stack
echo ===============================

cd /d C:\Users\Jesse\Documents\Arrs

docker compose up -d

echo.
echo Containers status:
docker compose ps

echo.
echo Done.
pause
