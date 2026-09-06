const youtubedlp = require("yt-dlp-exec");
const path = require("path");
const fs = require("fs-extra");

const DOWNLOAD_DIR = path.join(__dirname, "../downloads");
fs.ensureDirSync(DOWNLOAD_DIR);

// Video Download
async function downloadVideo(url, quality = "720") {
  const fileName = `yt_${Date.now()}.mp4`;
  const output = path.join(DOWNLOAD_DIR, fileName);

  await youtubedlp(url, {
    format: `bestvideo[height<=${quality}]+bestaudio/best[height<=${quality}]`,
    output,
    mergeOutputFormat: "mp4"
  });

  const size = fs.statSync(output).size;
  return { file: output, size, fileName };
}

// MP3 Download
async function downloadMP3(url) {
  const fileName = `yt_${Date.now()}.mp3`;
  const output = path.join(DOWNLOAD_DIR, fileName);

  await youtubedlp(url, {
    extractAudio: true,
    audioFormat: "mp3",
    output
  });

  const size = fs.statSync(output).size;
  return { file: output, size, fileName };
}

module.exports = { downloadVideo, downloadMP3 };
