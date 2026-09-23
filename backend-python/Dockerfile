FROM python:3.11-slim

WORKDIR /app

# OpenCV needs these system libs even in "headless" mode
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libsm6 libxext6 libxrender1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .
COPY model/ ./model/

# Bind to localhost/internal network only. In docker-compose this is only
# reachable by the node-gateway service via the internal Docker network —
# we do NOT publish this container's port to the host.
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
