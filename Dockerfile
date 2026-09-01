FROM python:3.11-slim

# FFmpeg, Git နှင့် Node.js (yt-dlp JS runtime အတွက်) တပ်ဆင်ခြင်း
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    git \
    nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "main.py"]
