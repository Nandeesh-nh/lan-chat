@echo off
echo Starting Modern LAN Chat Application...
echo.
echo This will start both the backend server and frontend development server.
echo.
echo Make sure you have installed the dependencies:
echo - Backend: pip install -r requirements.txt
echo - Frontend: npm install
echo.

echo Starting backend server...
start "Backend Server" cmd /k "python server.py"

echo Waiting 3 seconds for backend to start...
timeout /t 3 /nobreak > nul

echo Starting frontend development server...
start "Frontend Server" cmd /k "npm run dev"

echo.
echo Both servers are starting...
echo - Backend: http://localhost:5000
echo - Frontend: http://localhost:3000
echo.
echo Press any key to close this window...
pause > nul
