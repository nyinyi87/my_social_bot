const youtubedlp = require("yt-dlp-exec");
const path = require("path");
const fs = require("fs-extra");

const DOWNLOAD_DIR = path.join(__dirname, "../downloads");
fs.ensureDirSync(DOWNLOAD_DIR);

async function downloadFacebook(url) {
  const fileName = `fb_${Date.now()}.mp4`;
  const output = path.join(DOWNLOAD_DIR, fileName);

  await youtubedlp(url, {
    format: "best",
    output
  });

  const size = fs.statSync(output).size;
  return { file: output, size, fileName };
}

module.exports = { downloadFacebook };
