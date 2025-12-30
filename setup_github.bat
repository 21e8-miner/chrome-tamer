@echo off
set GIT_PATH="C:\Program Files\Git\cmd\git.exe"

echo --- CHROME TAMER GITHUB SETUP ---
echo.
echo 1. Go to https://github.com/new
echo 2. Name the repository: chrome-tamer
echo 3. Click "Create repository"
echo 4. Copy the HTTPS URL (e.g., https://github.com/username/chrome-tamer.git)
echo.
set /p REPO_URL="Paste the Repo URL here: "

%GIT_PATH% remote remove origin 2>nul
%GIT_PATH% remote add origin %REPO_URL%
%GIT_PATH% branch -M main
echo.
echo --- PUSHING TO GITHUB (Enter Credentials when prompted) ---
%GIT_PATH% push -u origin main

pause
