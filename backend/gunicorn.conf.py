"""Gunicorn settings for production (Render / Docker)."""

import os

bind = f"0.0.0.0:{os.getenv('PORT', '8000')}"
worker_class = "uvicorn.workers.UvicornWorker"
# Each worker builds the population model and RAG index in memory; keep this small on free tiers.
workers = int(os.getenv("WEB_CONCURRENCY", "1"))
# Streaming advisor answers can run for a while; don't kill them mid-response.
timeout = int(os.getenv("GUNICORN_TIMEOUT", "180"))
graceful_timeout = 30
keepalive = 75
forwarded_allow_ips = "*"  # trust X-Forwarded-For from Render's proxy (used by per-IP rate limits)
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info")
