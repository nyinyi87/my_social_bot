# Debian Bookworm (Latest Stable) ကို ပြောင်းသုံးခြင်းဖြင့် apt-get error ကို ရှင်းပေးပါမည်
FROM node:18-bookworm-slim

# apt update စစ်ဆေးခြင်း နှင့် yt-dlp, ffmpeg များ Install လုပ်ခြင်း
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    ffmpeg \
    curl \
    ca-certificates \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependency များ ထည့်သွင်းခြင်း
COPY package*.json ./
RUN npm install --production

# Application code များ ကူးယူခြင်း
COPY . .

# Downloads Folder မရှိပါက တည်ဆောက်ခြင်း
RUN mkdir -p downloads

EXPOSE 3000

CMD ["node", "index.js"]
