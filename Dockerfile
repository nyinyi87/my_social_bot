FROM python:3.10-slim

# Pre-built Static FFmpeg နှင့် Probe ကို ကူးယူခြင်း (စက္ကန့်ပိုင်းပဲ ကြာပါမည်)
COPY --from=mwader/static-ffmpeg:6.0 /ffmpeg /usr/local/bin/
COPY --from=mwader/static-ffmpeg:6.0 /ffprobe /usr/local/bin/

# git သာ လိုအပ်ပါက အောက်ပါအတိုင်း ပေါ့ပါးစွာ ထည့်ပါ
RUN apt-get update && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8080

CMD ["python", "main.py"]
