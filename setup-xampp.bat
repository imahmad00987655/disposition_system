@echo off
echo ================================================
echo   XAMPP Setup for Call Center Management System
echo ================================================
echo.

REM Copy PHP files to XAMPP htdocs
echo Copying PHP files to XAMPP...
xcopy "%~dp0csd8\*.php" "C:\xampp\htdocs\csd8\" /E /I /Y

echo.
echo ================================================
echo   Setup Complete!
echo ================================================
echo.
echo Next Steps:
echo 1. Make sure XAMPP Apache and MySQL are running
echo 2. Restart Next.js dev server (npm run dev)
echo 3. Open http://localhost:6126/login
echo.
echo Test XAMPP directly:
echo http://localhost/csd8/fetch_agent_name.php?user_no=2
echo.
pause
