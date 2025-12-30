@echo off
echo ==========================================
echo   CHROME TAMER BETA BUILD SCRIPT
echo ==========================================

:: Install dependencies
echo [1/3] Installing technical dependencies...
pip install psutil PyQt6 fastapi uvicorn Jinja2 PyInstaller

:: Build executable
echo [2/3] Compiling Release Candidate...
pyinstaller build.spec --noconfirm

:: Rename for beta server
copy dist\ChromeTamer.exe dist\ChromeTamer_Beta.exe

echo [3/3] Starting Beta Server...
echo The website will be available at http://localhost:8000
python server.py

pause
