const YTDlpWrap = require("yt-dlp-wrap").default;
const fs = require("fs-extra");

fs.ensureDirSync("./downloads");

const yt = new YTDlpWrap("/usr/local/bin/yt-dlp");

async function downloadVideo(url, quality) {

  const output = `downloads/${Date.now()}.mp4`;

  await yt.execPromise([
    url,
    "-f",
    `bestvideo[height<=${quality}]+bestaudio/best[height<=${quality}]`,
    "--merge-output-format",
    "mp4",
    "-o",
    output
  ]);

  return output;
}

async function downloadMP3(url) {

  const output = `downloads/${Date.now()}.mp3`;

  await yt.execPromise([
    url,
    "-x",
    "--audio-format",
    "mp3",
    "-o",
    output
  ]);

  return output;
}

module.exports = {
  downloadVideo,
  downloadMP3
};
