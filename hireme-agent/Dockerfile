FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    ffmpeg \
    libasound2-dev \
    portaudio19-dev \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Install dependencies first
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 2. Copy the agent code BEFORE running the model download
# This ensures the download script can see your agent's config
COPY src/ ./src/

# 3. Use the agent's own built-in downloader
# This is much more reliable than guessing HuggingFace paths
RUN LIVEKIT_API_KEY=dev LIVEKIT_API_SECRET=dev python src/agent.py download-files

EXPOSE 8081

# -u for real-time logging
CMD ["python", "-u", "src/agent.py", "dev"]