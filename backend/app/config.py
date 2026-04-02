"""
FinSight AI — Configuration
============================
Centralized settings loaded from environment variables.
Uses pydantic-settings for validation and type safety.
"""

import os
from pydantic_settings import BaseSettings

# Compute the path to backend/.env regardless of where the process was started
_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
_ENV_FILE = os.path.join(_BACKEND_DIR, ".env")


class Settings(BaseSettings):
    """Application settings — values come from .env file or environment."""

    # ── MongoDB ──────────────────────────────────────────────────────────
    MONGODB_URI: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "finsight_ai"

    # ── JWT Authentication ───────────────────────────────────────────────
    JWT_SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 60

    # ── General ──────────────────────────────────────────────────────────
    APP_NAME: str = "FinSight AI"
    DEBUG: bool = True
    GROQ_API_KEY: str | None = None

    class Config:
        env_file = _ENV_FILE
        extra = "ignore"


# Single settings instance used across the app
settings = Settings()
