FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for OpenCV and Node.js
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libsm6 libxext6 libxrender1 curl ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Python backend dependencies
COPY backend-python/requirements.txt /app/backend-python/requirements.txt
RUN pip install --no-cache-dir -r /app/backend-python/requirements.txt

# Install Node gateway dependencies
COPY backend-node/package.json backend-node/package-lock.json /app/backend-node/
RUN cd /app/backend-node && npm install --omit=dev

# Copy application source code
COPY backend-python /app/backend-python
COPY backend-node /app/backend-node

# Copy startup script
COPY start-backend.sh /app/start-backend.sh
RUN chmod +x /app/start-backend.sh

EXPOSE 4000 10000

CMD ["/bin/bash", "/app/start-backend.sh"]
