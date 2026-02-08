@echo off
echo ========================================
echo   Dental Clinic Management System
echo   Starting Application...
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo [1/2] Installing dependencies...
    echo This will take 2-3 minutes...
    echo.
    call npm install
    echo.
    echo Dependencies installed successfully!
    echo.
) else (
    echo Dependencies already installed.
    echo.
)

echo [2/2] Starting application...
echo.
echo The application will open in a few seconds...
echo.
echo Login credentials:
echo   Username: admin
echo   Password: admin123
echo.
echo Press Ctrl+C to stop the application.
echo ========================================
echo.

call npm run dev

pause
