const ytdlp = require("yt-dlp-exec");
const path = require("path");
const fs = require("fs-extra");

const DOWNLOAD_DIR = path.join(__dirname, "../downloads");
fs.ensureDirSync(DOWNLOAD_DIR);

// Instagram Video/Reel
async function downloadInstagram(url, quality = "720") {
  const fileName = `ig_${quality}_${Date.now()}.mp4`;
  const output = path.join(DOWNLOAD_DIR, fileName);

  await ytdlp(url, {
    format: `best[height<=${quality}]`,
    output
  });

  const size = fs.statSync(output).size;
  return { file: output, fileName, size };
}

// Instagram MP3
async function downloadInstagramMP3(url) {
  const fileName = `ig_${Date.now()}.mp3`;
  const output = path.join(DOWNLOAD_DIR, fileName);

  await ytdlp(url, {
    extractAudio: true,
    audioFormat: "mp3",
    output
  });

  const size = fs.statSync(output).size;
  return { file: output, fileName, size };
}

// Instagram Photo / Carousel
async function downloadInstagramPhoto(url) {
  const info = await ytdlp(url, {
    dumpSingleJson: true
  });

  let photos = [];

  if (info.entries) {
    photos = info.entries.map(e => e.url || e.thumbnail);
  } else {
    photos.push(info.thumbnail);
  }

  return { photos };
}

module.exports = {
  downloadInstagram,
  downloadInstagramMP3,
  downloadInstagramPhoto
};
