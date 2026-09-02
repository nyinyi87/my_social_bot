FROM python:3.10-slim

# FFmpeg နှင့် လိုအပ်သော System Package များ တင်ယူခြင်း
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Requirements များကို Install လုပ်ခြင်း
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Project File များအားလုံးကို Copy ကူးခြင်း
COPY . .

# downloads folder မရှိပါက ဆောက်ပေးခြင်း
RUN mkdir -p downloads

EXPOSE 8080

CMD ["python", "main.py"]
