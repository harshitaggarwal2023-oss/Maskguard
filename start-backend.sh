#!/bin/bash
set -e

# Generate an internal token if not provided
if [ -z "$INTERNAL_SERVICE_TOKEN" ]; then
  export INTERNAL_SERVICE_TOKEN="maskguard-internal-secret-token"
fi

export INFERENCE_SERVICE_URL="http://127.0.0.1:8000"

# Render provides PORT in the environment (usually 10000); fallback to 4000
export PORT="${PORT:-4000}"

echo "[MaskGuard] Starting Python inference service on 127.0.0.1:8000..."
cd /app/backend-python
python3 -m uvicorn main:app --host 127.0.0.1 --port 8000 &
PYTHON_PID=$!

# Wait for python service to respond to /health
echo "[MaskGuard] Waiting for inference service to be ready..."
for i in {1..30}; do
  if python3 -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')" 2>/dev/null; then
    echo "[MaskGuard] Inference service is ready!"
    break
  fi
  sleep 1
done

# Start Node gateway on the public PORT
echo "[MaskGuard] Starting Node.js gateway on port $PORT..."
cd /app/backend-node
exec node src/index.js
