const ytdlp = require("yt-dlp-exec");
const path = require("path");
const fs = require("fs-extra");

const DOWNLOAD_DIR = path.join(__dirname, "../downloads");
fs.ensureDirSync(DOWNLOAD_DIR);

// Video Download
async function downloadVideo(url, quality) {
  const fileName = `yt_${quality}_${Date.now()}.mp4`;
  const output = path.join(DOWNLOAD_DIR, fileName);

  await ytdlp(url, {
    format: `bestvideo[height<=${quality}]+bestaudio/best[height<=${quality}]`,
    mergeOutputFormat: "mp4",
    output
  });

  const size = fs.statSync(output).size;
  return { file: output, fileName, size };
}

// MP3 Download
async function downloadMP3(url) {
  const fileName = `yt_${Date.now()}.mp3`;
  const output = path.join(DOWNLOAD_DIR, fileName);

  await ytdlp(url, {
    extractAudio: true,
    audioFormat: "mp3",
    output
  });

  const size = fs.statSync(output).size;
  return { file: output, fileName, size };
}

// Available Quality
async function getQualities(url) {
  const info = await ytdlp(url, {
    dumpSingleJson: true
  });

  return info.formats
    .filter(f => f.height)
    .map(f => ({
      quality: f.height,
      formatId: f.format_id
    }));
}

module.exports = {
  downloadVideo,
  downloadMP3,
  getQualities
};
