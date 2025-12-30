$git = "C:\Program Files\Git\cmd\git.exe"

Write-Host "--- CHROME TAMER GITHUB SETUP (PowerShell) ---" -ForegroundColor Cyan
Write-Host "1. Ensure you have created a repo at https://github.com/new"
Write-Host "2. Copy the HTTPS URL."
Write-Host ""
$repoUrl = Read-Host "Paste the GitHub Repo URL here"

if ([string]::IsNullOrWhiteSpace($repoUrl)) {
    Write-Host "Error: No URL provided." -ForegroundColor Red
    exit
}

Write-Host "Linking remote..."
try {
    & $git remote remove origin 2>$null
    & $git remote add origin $repoUrl
    & $git branch -M main
    
    Write-Host "--- PUSHING TO GITHUB ---" -ForegroundColor Yellow
    Write-Host "A login window should appear..."
    & $git push -u origin main
} catch {
    Write-Host "An error occurred: $_" -ForegroundColor Red
}

Read-Host "Press Enter to exit"
