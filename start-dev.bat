@echo off
echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║   KSIT Dormitory Management System - Starting...      ║
echo ╚════════════════════════════════════════════════════════╝
echo.

echo Starting Backend Server...
start "Backend API" cmd /k "cd backend && npm start"

timeout /t 3 /nobreak > nul

echo Starting Frontend Server...
start "Frontend App" cmd /k "cd frontend && npm run dev"

echo.
echo ✓ Backend API: http://localhost:5000
echo ✓ Frontend App: http://localhost:3000
echo.
echo Both servers are starting in separate windows.
echo Press any key to exit this window...
pause > nul
