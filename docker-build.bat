@echo off
REM Docker Build and Deploy Script for Windows
REM Usage: docker-build.bat [production|development]

setlocal enabledelayedexpansion

set ENV=%1
if "%ENV%"=="" set ENV=production

set IMAGE_NAME=disposition-system
set CONTAINER_NAME=disposition-system-nextjs
set PORT=6126

echo 🚀 Building Docker image for %ENV% environment...

REM Build the image
if "%ENV%"=="production" (
    docker build -t %IMAGE_NAME%:latest .
) else (
    docker build -f Dockerfile.simple -t %IMAGE_NAME%:dev .
)

if errorlevel 1 (
    echo ❌ Build failed!
    exit /b 1
)

echo ✅ Build complete!

REM Stop and remove existing container if running
docker ps -aq -f name=%CONTAINER_NAME% >nul 2>&1
if %errorlevel%==0 (
    echo 🛑 Stopping existing container...
    docker stop %CONTAINER_NAME%
    docker rm %CONTAINER_NAME%
)

echo 🏃 Starting container on port %PORT%...

REM Run the container
docker run -d ^
    --name %CONTAINER_NAME% ^
    -p %PORT%:6126 ^
    -e NODE_ENV=%ENV% ^
    -e NEXT_PUBLIC_API_BASE_URL=http://localhost/Disposition-system/ ^
    -e NEXT_PUBLIC_COMPLAINTS_API=http://192.168.1.209:6004/callcenterreportdata ^
    -e NEXT_PUBLIC_ORDERS_API=http://192.168.1.209:5125/api_data ^
    --restart unless-stopped ^
    %IMAGE_NAME%:latest

if errorlevel 1 (
    echo ❌ Failed to start container!
    exit /b 1
)

echo ✅ Container started successfully!
echo.
echo 📝 Useful commands:
echo   View logs: docker logs -f %CONTAINER_NAME%
echo   Stop: docker stop %CONTAINER_NAME%
echo   Remove: docker rm %CONTAINER_NAME%
echo   Access: http://localhost:%PORT%

endlocal

