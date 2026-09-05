const ytdlp = require("yt-dlp-exec");
const path = require("path");
const fs = require("fs");

const downloadDir = path.join(__dirname, "../downloads");
if (!fs.existsSync(downloadDir)) {
  fs.mkdirSync(downloadDir, { recursive: true });
}

async function downloadVideo(url, quality) {
  const outputPath = path.join(downloadDir, `yt_${Date.now()}.mp4`);

  await ytdlp(url, {
    format: `bestvideo[height<=${quality}]+bestaudio/best[height<=${quality}]/best`,
    output: outputPath,
    mergeOutputFormat: "mp4"
  });

  return outputPath;
}

async function downloadMP3(url) {
  const outputPath = path.join(downloadDir, `yt_${Date.now()}.mp3`);

  await ytdlp(url, {
    extractAudio: true,
    audioFormat: "mp3",
    output: outputPath
  });

  return outputPath;
}

module.exports = { downloadVideo, downloadMP3 };
