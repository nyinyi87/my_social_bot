FROM python:3.10-slim

# ffmpeg ထည့်သွင်းခြင်း (Video နှင့် Audio များ ပေါင်းစပ်ရန်)
RUN apt-get update && apt-get install -y ffmpeg git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8080

CMD ["python", "main.py"]
