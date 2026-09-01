FROM python:3.10-slim

# FFmpeg နှင့် Git တပ်ဆင်ခြင်း
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Requirements များ တပ်ဆင်ခြင်း
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Project file များကို Copy ကူးခြင်း
COPY . .

# Bot ကို စတင် run ခြင်း
CMD ["python", "main.py"]
