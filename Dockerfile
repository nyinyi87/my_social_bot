FROM node:20-alpine

WORKDIR /app

# ffmpeg + python + yt-dlp install
RUN apk add --no-cache python3 py3-pip ffmpeg \
    && pip3 install --break-system-packages yt-dlp

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
