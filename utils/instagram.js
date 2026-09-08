const ytdlp = require("yt-dlp-exec");
const path = require("path");
const fs = require("fs-extra");

const DOWNLOAD_DIR = path.join(__dirname, "../downloads");
fs.ensureDirSync(DOWNLOAD_DIR);

// ===============================
// Instagram Video / Reel Download
// ===============================
async function downloadInstagram(url, quality = "720") {

  const fileName = `instagram_${quality}_${Date.now()}.mp4`;
  const output = path.join(DOWNLOAD_DIR, fileName);

  await ytdlp(url, {
    format: `bv*[height<=${quality}]+ba/b[height<=${quality}]`,
    mergeOutputFormat: "mp4",
    output: output,
    noWarnings: true
  });

  return {
    file: output,
    fileName,
    size: fs.statSync(output).size
  };
}

// ===============================
// Instagram MP3 Download
// ===============================
async function downloadInstagramMP3(url) {

  const fileName = `instagram_${Date.now()}.mp3`;
  const output = path.join(DOWNLOAD_DIR, fileName);

  await ytdlp(url, {
    extractAudio: true,
    audioFormat: "mp3",
    audioQuality: "0",
    output: output,
    noWarnings: true
  });

  return {
    file: output,
    fileName,
    size: fs.statSync(output).size
  };
}

// ===============================
// Instagram Photo / Carousel
// ===============================
async function downloadInstagramPhoto(url) {

  const info = await ytdlp(url, {
    dumpSingleJson: true,
    noWarnings: true
  });

  const photos = [];

  // Carousel
  if (info.entries) {
    for (const item of info.entries) {
      if (item.thumbnail) {
        photos.push(item.thumbnail);
      }
    }
  }

  // Single Photo
  if (info.thumbnail) {
    photos.push(info.thumbnail);
  }

  return { photos };
}

// ===============================
// Instagram Info
// ===============================
async function getInstagramInfo(url) {

  const info = await ytdlp(url, {
    dumpSingleJson: true
  });

  return {
    title: info.title,
    thumbnail: info.thumbnail,
    uploader: info.uploader,
    duration: info.duration
  };
}

// ===============================
// Available Qualities
// ===============================
async function getInstagramQualities(url) {

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
  downloadInstagram,
  downloadInstagramMP3,
  downloadInstagramPhoto,
  getInstagramInfo,
  getInstagramQualities
};
