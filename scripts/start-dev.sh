#!/usr/bin/env bash
# Start backend and frontend for local testing.
# Run from repo root. Use two terminals, or run backend in background.

set -e
cd "$(dirname "$0")/.."

echo "Speak-Up dev servers"
echo "===================="
echo ""

# Backend
if ! python -c "import uvicorn" 2>/dev/null; then
  echo "Backend: Install deps first: pip install -r requirements.txt (or: uv pip install -r requirements.txt)"
  echo "Then in one terminal run:"
  echo "  uvicorn app.main:app --host 0.0.0.0 --port 8000"
  echo ""
else
  echo "Backend: Start with: uvicorn app.main:app --host 0.0.0.0 --port 8000"
  echo "  (Or: uv run uvicorn app.main:app --host 0.0.0.0 --port 8000)"
  echo ""
fi

# Frontend
if ! command -v npm &>/dev/null; then
  echo "Frontend: npm not found. Install Node.js, then run:"
  echo "  cd frontend && npm install && npm run dev"
  echo ""
else
  echo "Frontend: Start with: cd frontend && npm install && npm run dev"
  echo ""
fi

echo "Backend will be at http://localhost:8000 (API docs: http://localhost:8000/docs)"
echo "Frontend will be at http://localhost:3000"
echo ""
echo "Use two terminals:"
echo "  Terminal 1: uvicorn app.main:app --host 0.0.0.0 --port 8000"
echo "  Terminal 2: cd frontend && npm run dev"
