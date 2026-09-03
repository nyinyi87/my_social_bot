const YTDlpWrap = require("yt-dlp-wrap").default;
const path = require("path");
const fs = require("fs-extra");

const yt = new YTDlpWrap();
const DOWNLOAD_DIR = "./downloads";

fs.ensureDirSync(DOWNLOAD_DIR);

async function downloadInstagram(url) {
  const file = `${Date.now()}_instagram.mp4`;
  const output = path.join(DOWNLOAD_DIR, file);

  await yt.execPromise([
    url,
    "-o", output
  ]);

  return output;
}

module.exports = { downloadInstagram };
