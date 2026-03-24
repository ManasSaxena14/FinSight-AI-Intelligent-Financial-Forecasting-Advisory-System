"""
FinSight AI — Main FastAPI Application
=======================================
Entry point for the backend server.
Provides a health-check route and will later host
all API routers (auth, expenses, predictions, etc.).
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.routes import ml, expenses, auth, premium
from app.db import DatabaseManager

# ---------------------------------------------------------------------------
# MongoDB connection lifespan
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to MongoDB
    DatabaseManager.connect_to_database()
    yield
    # Shutdown: Close MongoDB connection
    DatabaseManager.close_database_connection()

# ---------------------------------------------------------------------------
# App Initialization
# ---------------------------------------------------------------------------
app = FastAPI(
    title="FinSight AI",
    description="Intelligent Financial Forecasting & Advisory System",
    version="1.0.0",
    lifespan=lifespan
)

# ---------------------------------------------------------------------------
# CORS — Allow frontend to communicate with backend
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],   # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
