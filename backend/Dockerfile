# FinSight AI backend — portable container (Render, Fly.io, Railway, Cloud Run, ...)
FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8000

WORKDIR /app

# Build with --build-arg WITH_EMBEDDINGS=1 to enable semantic RAG search (~250 MB more RAM).
ARG WITH_EMBEDDINGS=0
COPY requirements.txt requirements-rag.txt ./
RUN if [ "$WITH_EMBEDDINGS" = "1" ]; then pip install -r requirements-rag.txt; else pip install -r requirements.txt; fi

COPY app ./app
COPY data/cleaned_financial_data.csv ./data/cleaned_financial_data.csv
COPY gunicorn.conf.py ./

RUN useradd --create-home finsight && mkdir -p data/.rag_cache && chown -R finsight /app
USER finsight

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s CMD python -c "import urllib.request,os; urllib.request.urlopen(f'http://127.0.0.1:{os.environ.get(\"PORT\",\"8000\")}/')" || exit 1
CMD ["gunicorn", "app.main:app", "-c", "gunicorn.conf.py"]
