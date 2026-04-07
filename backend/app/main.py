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
import logging

from app.config import settings
from app.routes import ml, expenses, auth, premium
from app.db import DatabaseManager

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# MongoDB connection lifespan
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Connect to MongoDB at startup. If that fails and DEBUG is True, the API still
    binds so the Vite proxy gets a live server (avoids opaque 502 when only DB is down).
    Production (DEBUG=False) fails fast so bad deploys are obvious.
    """
    settings.validate_startup()
    try:
        await DatabaseManager.connect_to_database()
    except Exception:
        logger.exception("MongoDB connection failed at startup")
        if not settings.DEBUG:
            raise
        logger.warning(
            "DEBUG=True: starting API without MongoDB. Fix backend/.env (MONGODB_URI) or start "
            "mongod; DB routes will 500 until the database is reachable."
        )
    yield
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
    allow_origins=settings.ALLOWED_ORIGINS,
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
    logger.exception("Unhandled exception on %s", request.url.path)
    
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal Server Error",
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


@app.get("/api/health")
async def api_health():
    """Liveness + MongoDB readiness (use this when debugging 502 from the dev proxy)."""
    if DatabaseManager.db is None:
        try:
            await DatabaseManager.connect_to_database()
        except Exception as e:
            return JSONResponse(
                status_code=503,
                content={
                    "status": "degraded",
                    "mongodb": "disconnected",
                    "detail": str(e) if settings.DEBUG else "Database unavailable",
                },
            )
    try:
        await DatabaseManager.client.admin.command("ping")
        return {"status": "ok", "mongodb": "connected"}
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={
                "status": "degraded",
                "mongodb": "error",
                "detail": str(e) if settings.DEBUG else "Database error",
            },
        )
