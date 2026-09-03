const YTDlpWrap = require("yt-dlp-wrap").default;
const yt = new YTDlpWrap("/usr/bin/yt-dlp");

async function downloadFacebook(url) {

  const output = `downloads/${Date.now()}.mp4`;

  await yt.execPromise([
    url,
    "-o",
    output
  ]);

  return output;
}

module.exports = { downloadFacebook };
