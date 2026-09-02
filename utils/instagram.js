const YTDLP = require("yt-dlp-wrap").default;
const path = require("path");
const yt = new YTDLP();

async function downloadInstagram(url) {
  const outputPath = path.join(__dirname, `../downloads/insta_${Date.now()}.mp4`);
  await yt.execPromise([url, "-o", outputPath]);
  return outputPath;
}

module.exports = {
  downloadInstagram
};

