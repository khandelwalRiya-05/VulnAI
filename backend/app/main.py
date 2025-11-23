from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routers import upload
from app.routers import auth_router
import os

app = FastAPI(
    title="VulnAI API",
    version="1.0.0",
    description="AI Model Vulnerability Scanner with User Authentication"
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",  # Vite default
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create necessary directories
os.makedirs("uploads", exist_ok=True)
os.makedirs("results", exist_ok=True)

# Mount static files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/results", StaticFiles(directory="results"), name="results")

# Include routers
app.include_router(auth_router.router, prefix="/api/v1", tags=["authentication"])
app.include_router(upload.router, prefix="/api/v1", tags=["models & scans"])

@app.get("/")
async def root():
    return {
        "message": "VulnAI API is running",
        "version": "1.0.0",
        "authentication": "Google OAuth 2.0",
        "docs": "/docs",
        "status": "healthy"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "VulnAI API",
        "authentication": "enabled"
    }

@app.get("/api/v1/status")
async def api_status():
    """API status endpoint"""
    return {
        "api_version": "1.0.0",
        "endpoints": {
            "auth": "/api/v1/auth/google",
            "upload_model": "/api/v1/upload-model",
            "upload_data": "/api/v1/upload-data",
            "scan": "/api/v1/scan",
            "models": "/api/v1/models",
            "images": "/api/v1/images"
        }
    }