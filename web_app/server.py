import os
import logging
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

import database
from core.config import LOG_FILE, STATIC_DIR, logger
from routers import videos, youtube, converter, ai, outro, collage

# Setup logging
logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)

# Initialize SQLite database (with WAL mode enabled)
database.init_db()

# Initialize FastAPI app
app = FastAPI(
    title="YouTube Scheduler Pro",
    version="2.6.0",
    description="Modular API for AI Video Studio, Conversion, and YouTube Scheduling"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "message": str(exc),
            "path": request.url.path
        }
    )

# Root endpoint
@app.get("/")
def read_root():
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"status": "ok", "message": "YouTube Scheduler Pro API is running"}

# Include Modular Routers
app.include_router(videos.router, prefix="/api", tags=["Videos & Library"])
app.include_router(youtube.router, prefix="/api", tags=["YouTube & Auth"])
app.include_router(converter.router, prefix="/api", tags=["Converter & Slicing"])
app.include_router(ai.router, prefix="/api", tags=["AI Studio"])
app.include_router(outro.router, prefix="/api", tags=["Outro & CTA"])
app.include_router(collage.router, prefix="/api", tags=["Collage & Timeline"])

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
