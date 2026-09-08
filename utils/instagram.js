const ytdlp = require("yt-dlp-exec");
const path = require("path");
const fs = require("fs-extra");

const DOWNLOAD_DIR = path.join(__dirname, "../downloads");
fs.ensureDirSync(DOWNLOAD_DIR);

// ===============================
// Get Video Information
// ===============================
async function getVideoInfo(url) {
  const info = await ytdlp(url, {
    dumpSingleJson: true,
    noWarnings: true,
    preferFreeFormats: true
  });

  return {
    title: info.title,
    thumbnail: info.thumbnail,
    duration: info.duration,
    uploader: info.uploader
  };
}

// ===============================
// Download Video (144p - 1080p)
// ===============================
async function downloadVideo(url, quality = "720") {

  const fileName = `youtube_${quality}_${Date.now()}.mp4`;
  const output = path.join(DOWNLOAD_DIR, fileName);

  await ytdlp(url, {
    format: `bv*[height<=${quality}]+ba/b[height<=${quality}]`,
    mergeOutputFormat: "mp4",
    output: output,
    noWarnings: true
  });

  const size = fs.statSync(output).size;

  return {
    file: output,
    fileName,
    size
  };
}

// ===============================
// Download MP3
// ===============================
async function downloadMP3(url) {

  const fileName = `youtube_${Date.now()}.mp3`;
  const output = path.join(DOWNLOAD_DIR, fileName);

  await ytdlp(url, {
    extractAudio: true,
    audioFormat: "mp3",
    audioQuality: "0",
    output: output,
    noWarnings: true
  });

  const size = fs.statSync(output).size;

  return {
    file: output,
    fileName,
    size
  };
}

// ===============================
// Available Qualities
// ===============================
async function getQualities(url) {

  const info = await ytdlp(url, {
    dumpSingleJson: true
  });

  const qualities = [];

  info.formats.forEach((f) => {
    if (
      f.height &&
      f.ext === "mp4" &&
      !qualities.includes(f.height)
    ) {
      qualities.push(f.height);
    }
  });

  qualities.sort((a, b) => a - b);

  return qualities;
}

module.exports = {
  getVideoInfo,
  getQualities,
  downloadVideo,
  downloadMP3
};
