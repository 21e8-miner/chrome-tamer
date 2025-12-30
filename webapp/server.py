from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import uvicorn
import os
from pathlib import Path

# Production Config
DEBUG = os.getenv("DEBUG", "false").lower() == "true"
PORT = int(os.getenv("PORT", 80)) # Real web server port

app = FastAPI(
    title="Chrome Tamer Production",
    description="The professional landing page for Chrome Tamer.",
    docs_url=None, # Disable internal docs for production unless debugging
    redoc_url=None
)

# Standard Middlewares
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

# Paths
BASE_DIR = Path(__file__).resolve().parent
DIST_DIR = BASE_DIR / "dist"
DOWNLOADS_DIR = Path(__file__).resolve().parent.parent / "dist" # The parent dist folder has the .exe

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# API Routes
@app.get("/api/health")
async def health():
    return {"status": "operational", "version": "1.0.0"}

@app.get("/download")
async def download_application():
    """Serves the latest production binary."""
    exe_name = "ChromeTamer_Beta.exe" # This is our current production-ready RC
    exe_path = DOWNLOADS_DIR / exe_name
    
    if exe_path.exists():
        return FileResponse(
            path=exe_path,
            filename="ChromeTamer_Setup.exe",
            media_type="application/octet-stream"
        )
    return {"error": "Production build is currently being refreshed. Please try again in a few minutes."}

# Serve Extensions and other static files from dist root
@app.get("/{filename}.zip")
async def download_zip(filename: str):
    file_path = DIST_DIR / f"{filename}.zip"
    if file_path.exists():
        return FileResponse(file_path, media_type="application/zip", filename=f"{filename}.zip")
    return {"error": "File not found"}

@app.get("/{filename}.exe")
async def download_exe(filename: str):
    file_path = DIST_DIR / f"{filename}.exe"
    if file_path.exists():
        return FileResponse(file_path, media_type="application/octet-stream", filename=f"{filename}.exe")
    # Fallback to parent dist for the setup exe if copied there
    parent_exe = DOWNLOADS_DIR / "ChromeTamer_Beta.exe"
    if filename == "ChromeTamer_Setup" and parent_exe.exists():
        return FileResponse(parent_exe, media_type="application/octet-stream", filename="ChromeTamer_Setup.exe")
    return {"error": "File not found"}


# Serve Vite Build
if DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="static")

    @app.get("/{full_path:path}", response_class=HTMLResponse)
    async def serve_frontend(full_path: str):
        index_file = DIST_DIR / "index.html"
        if index_file.exists():
            return index_file.read_text(encoding="utf-8")
        return "<h1>Server Configuration Error: Build missing.</h1>"
else:
    @app.get("/")
    async def welcome():
        return {"message": "Server online. Frontend build not detected."}

if __name__ == "__main__":
    print(f"--- Chrome Tamer Production Server ---")
    print(f"Running on port {PORT}")
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")
