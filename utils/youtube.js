const YTDLP = require("yt-dlp-wrap").default;
const path = require("path");
const yt = new YTDLP();

async function getThumbnail(url) {
  try {
    const output = await yt.execPromise([url, "--get-thumbnail"]);
    return output.trim();
  } catch (error) {
    console.error("Thumbnail Extraction Error:", error);
    return null;
  }
}

async function downloadVideo(url, quality) {
  const outputPath = path.join(__dirname, `../downloads/yt_${Date.now()}.mp4`);
  await yt.execPromise([url, "-f", "mp4", "-o", outputPath]);
  return outputPath;
}

async function downloadMP3(url) {
  const outputPath = path.join(__dirname, `../downloads/yt_${Date.now()}.mp3`);
  await yt.execPromise([url, "-x", "--audio-format", "mp3", "-o", outputPath]);
  return outputPath;
}

module.exports = {
  downloadVideo,
  downloadMP3,
  getThumbnail
};

