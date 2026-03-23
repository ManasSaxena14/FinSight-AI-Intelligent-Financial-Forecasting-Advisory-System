"""
FinSight AI — Configuration
============================
Centralized settings loaded from environment variables.
Uses pydantic-settings for validation and type safety.
"""

from pydantic_settings import BaseSettings


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

    class Config:
        env_file = ".env"


# Single settings instance used across the app
settings = Settings()
