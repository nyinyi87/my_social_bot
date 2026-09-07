const ytdlp = require("yt-dlp-exec");
const path = require("path");
const fs = require("fs-extra");

const DOWNLOAD_DIR = path.join(__dirname, "../downloads");
fs.ensureDirSync(DOWNLOAD_DIR);

// Facebook Video
async function downloadFacebook(url, quality = "720") {
  const fileName = `fb_${quality}_${Date.now()}.mp4`;
  const output = path.join(DOWNLOAD_DIR, fileName);

  await ytdlp(url, {
    format: `best[height<=${quality}]`,
    output
  });

  const size = fs.statSync(output).size;
  return { file: output, fileName, size };
}

// Facebook MP3
async function downloadFacebookMP3(url) {
  const fileName = `fb_${Date.now()}.mp3`;
  const output = path.join(DOWNLOAD_DIR, fileName);

  await ytdlp(url, {
    extractAudio: true,
    audioFormat: "mp3",
    output
  });

  const size = fs.statSync(output).size;
  return { file: output, fileName, size };
}

// Facebook Photo (best image URL)
async function downloadFacebookPhoto(url) {
  const info = await ytdlp(url, {
    dumpSingleJson: true
  });

  return {
    photos: info.thumbnails.map(t => t.url)
  };
}

module.exports = {
  downloadFacebook,
  downloadFacebookMP3,
  downloadFacebookPhoto
};
