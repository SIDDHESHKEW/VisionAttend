@echo off
echo Starting VisionAttend System...

cd /d "E:\Desktop E-Drive\Projects\VisionAttend"

start "AI Service" cmd /k "cd /d "E:\Desktop E-Drive\Projects\VisionAttend\vision-attend-ai" && venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8000"

timeout /t 3 >nul

start "Backend" cmd /k "cd /d "E:\Desktop E-Drive\Projects\VisionAttend\backend" && node server.js"

timeout /t 3 >nul

start "Frontend" cmd /k "cd /d "E:\Desktop E-Drive\Projects\VisionAttend\vision-attend-frontend" && npm run dev"

echo Done! Check the 3 new windows.
pause    