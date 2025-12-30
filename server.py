from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import uvicorn
import os
from pathlib import Path

app = FastAPI(title="Chrome Tamer Beta Server")

# Define paths
BASE_DIR = Path(__file__).resolve().parent
LANDING_DIR = BASE_DIR / "landing"
ASSETS_DIR = BASE_DIR / "assets"

# Mock executable for beta testing
BETA_EXE_PATH = BASE_DIR / "dist" / "ChromeTamer_Beta.exe"

# Mount static files if assets exists
if ASSETS_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(ASSETS_DIR)), name="assets")

@app.get("/", response_class=HTMLResponse)
async def read_root():
    """Serves the main landing page."""
    index_path = LANDING_DIR / "index.html"
    if index_path.exists():
        return index_path.read_text(encoding="utf-8")
    return "<h1>Landing page not found.</h1>"

@app.get("/download")
async def download_app():
    """Handle app download requests."""
    # In a real scenario, we'd serve the built .exe
    if BETA_EXE_PATH.exists():
        return FileResponse(
            path=BETA_EXE_PATH,
            filename="ChromeTamer_Setup.exe",
            media_type="application/octet-stream"
        )
    return {"error": "Beta build not yet finalized. Check back in 5 minutes!"}

@app.get("/api/health")
async def health_check():
    return {"status": "online", "version": "1.0.0-beta"}

if __name__ == "__main__":
    # Create dist folder if it doesn't exist for mocking
    os.makedirs(BASE_DIR / "dist", exist_ok=True)
    
    print("------------------------------------------")
    print("  CHROME TAMER BETA SERVER")
    print("  URL: http://localhost:8000")
    print("------------------------------------------")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)
