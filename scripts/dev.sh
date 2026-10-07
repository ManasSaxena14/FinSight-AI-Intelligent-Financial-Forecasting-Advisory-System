#!/usr/bin/env bash
# Start FinSight locally with the backend FIRST: the frontend only starts once
# the API reports healthy on /api/health (MongoDB connected).
#
#   ./scripts/dev.sh
#
# Needs backend/venv (python -m venv venv && pip install -r requirements-dev.txt),
# backend/.env, and frontend/node_modules (npm install).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${API_PORT:-8000}"
HEALTH="http://127.0.0.1:${PORT}/api/health"
TIMEOUT="${BACKEND_TIMEOUT:-90}"

[ -x "$ROOT/backend/venv/bin/python" ] || { echo "Missing backend/venv. Run: cd backend && python -m venv venv && venv/bin/pip install -r requirements-dev.txt"; exit 1; }
[ -f "$ROOT/backend/.env" ]           || { echo "Missing backend/.env. Copy backend/.env.example and fill it in."; exit 1; }
[ -d "$ROOT/frontend/node_modules" ]  || { echo "Missing frontend/node_modules. Run: cd frontend && npm install"; exit 1; }

cleanup() { [ -n "${API_PID:-}" ] && kill "$API_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

echo "[1/2] Starting backend on port ${PORT}..."
( cd "$ROOT/backend" && exec venv/bin/python -m uvicorn app.main:app --port "$PORT" ) &
API_PID=$!

printf "      waiting for %s " "$HEALTH"
for ((i = 1; i <= TIMEOUT; i++)); do
  if ! kill -0 "$API_PID" 2>/dev/null; then echo; echo "Backend exited during startup. See the log above."; exit 1; fi
  if curl -fsS --max-time 2 "$HEALTH" >/dev/null 2>&1; then echo " ready."; break; fi
  printf "."; sleep 1
  if [ "$i" -eq "$TIMEOUT" ]; then echo; echo "Backend not healthy after ${TIMEOUT}s (is MongoDB reachable?). Aborting."; exit 1; fi
done

echo "[2/2] Starting frontend on http://localhost:5173 ..."
cd "$ROOT/frontend" && npm run dev
