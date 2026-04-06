"""
FinSight AI — Main FastAPI Application
=======================================
Entry point for the backend server.
Provides a health-check route and will later host
all API routers (auth, expenses, predictions, etc.).
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import traceback

from app.config import settings
from app.routes import ml, expenses, auth, premium
from app.db import DatabaseManager

# ---------------------------------------------------------------------------
# MongoDB connection lifespan
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to MongoDB
    await DatabaseManager.connect_to_database()
    yield
    # Shutdown: Close MongoDB connection
    await DatabaseManager.close_database_connection()

# ---------------------------------------------------------------------------
# App Initialization
# ---------------------------------------------------------------------------
app = FastAPI(
    title=settings.APP_NAME,
    description="Intelligent Financial Forecasting & Advisory System",
    version="1.0.0",
    lifespan=lifespan
)

# ---------------------------------------------------------------------------
# CORS — Allow frontend to communicate with backend
# ---------------------------------------------------------------------------
# We use a broad CORS configuration to ensure no blocking occurs during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS + ["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Global Exception Handler
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Catch all unhandled exceptions and return a JSON response.
    This ensures that even on 500 errors, we can return CORS headers 
    (if the middleware catches this response) and a helpful message.
    """
    error_details = traceback.format_exc()
    print(f"GLOBAL ERROR CAUGHT: {exc}")
    print(error_details)
    
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal Server Error",
            "message": str(exc),
            "traceback": error_details if settings.DEBUG else None
        },
    )

# ---------------------------------------------------------------------------
# Include API Routers
# ---------------------------------------------------------------------------
app.include_router(auth.router)
app.include_router(ml.router)
app.include_router(expenses.router)
app.include_router(premium.router)

# ---------------------------------------------------------------------------
# Health Check
# ---------------------------------------------------------------------------
@app.get("/")
def health_check():
    """Simple health-check endpoint."""
    return {
        "status": "ok",
        "message": "FinSight AI API is running",
    }
