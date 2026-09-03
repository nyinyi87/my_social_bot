const YTDlpWrap = require("yt-dlp-wrap").default;
const fs = require("fs-extra");
const path = require("path");

const yt = new YTDlpWrap();

const DOWNLOAD_DIR = "./downloads";

fs.ensureDirSync(DOWNLOAD_DIR);

// Video Download
async function downloadVideo(url, quality) {

  const file = `${Date.now()}_${quality}.mp4`;
  const output = path.join(DOWNLOAD_DIR, file);

  let format = "bestvideo+bestaudio";

  if (quality !== "1080") {
    format = `bestvideo[height<=${quality}]+bestaudio/best[height<=${quality}]`;
  }

  await yt.execPromise([
    url,
    "-f", format,
    "--merge-output-format", "mp4",
    "-o", output
  ]);

  return output;
}

// MP3 Download
async function downloadMP3(url) {

  const file = `${Date.now()}.mp3`;
  const output = path.join(DOWNLOAD_DIR, file);

  await yt.execPromise([
    url,
    "-x",
    "--audio-format", "mp3",
    "-o", output
  ]);

  return output;
}

module.exports = {
  downloadVideo,
  downloadMP3
};
