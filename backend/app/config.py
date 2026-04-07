"""
FinSight AI — Configuration
============================
Centralized settings loaded from environment variables.
Uses pydantic-settings for validation and type safety.
"""

import os
from typing import List
from pydantic import ConfigDict
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
    JWT_SECRET_KEY: str = "change-me-in-env"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 60

    # ── General ──────────────────────────────────────────────────────────
    APP_NAME: str = "FinSight AI"
    ENV: str = "development"  # development | production
    DEBUG: bool = False
    GROQ_API_KEY: str | None = None
    ALLOWED_ORIGINS: List[str] = [
        "https://finsight-ai.vercel.app",
        "https://finsight-ai-frontend.vercel.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]

    def validate_startup(self) -> None:
        """Fail fast on unsafe production configuration."""
        if self.ENV.lower() != "production":
            return

        problems: list[str] = []
        if self.DEBUG:
            problems.append("DEBUG must be False in production.")
        if self.JWT_SECRET_KEY in {"change-me-in-env", "super-secret", "your-secret-key-change-in-production"}:
            problems.append("JWT_SECRET_KEY must be replaced with a strong secret.")
        if len(self.JWT_SECRET_KEY) < 32:
            problems.append("JWT_SECRET_KEY must be at least 32 characters.")
        if not self.GROQ_API_KEY:
            problems.append("GROQ_API_KEY is required in production.")
        if not self.ALLOWED_ORIGINS:
            problems.append("ALLOWED_ORIGINS must include deployed frontend origin(s).")
        if any("*" in origin for origin in self.ALLOWED_ORIGINS):
            problems.append("Wildcard origins are not allowed in production.")

        if problems:
            raise RuntimeError("Invalid production configuration: " + " ".join(problems))

    model_config = ConfigDict(env_file=_ENV_FILE, extra="ignore")


# Single settings instance used across the app
settings = Settings()
