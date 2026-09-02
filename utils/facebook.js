const YTDLP = require("yt-dlp-wrap").default;
const path = require("path");
const yt = new YTDLP();

async function downloadFacebook(url) {
  const outputPath = path.join(__dirname, `../downloads/fb_${Date.now()}.mp4`);
  await yt.execPromise([url, "-f", "mp4", "-o", outputPath]);
  return outputPath;
}

module.exports = {
  downloadFacebook
};
