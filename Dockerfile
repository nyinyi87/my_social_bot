FROM node:20-alpine

WORKDIR /app

# Install ffmpeg + yt-dlp
RUN apk add --no-cache ffmpeg python3 py3-pip \
    && pip3 install --break-system-packages yt-dlp

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm","start"]
