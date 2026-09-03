const YTDlpWrap = require("yt-dlp-wrap").default;

const yt = new YTDlpWrap("/usr/local/bin/yt-dlp");

async function downloadFacebook(url) {

  const output = `downloads/facebook_${Date.now()}.mp4`;

  await yt.execPromise([
    url,
    "-o",
    output
  ]);

  return output;
}

module.exports = {
  downloadFacebook
};
