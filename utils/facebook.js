const axios = require("axios");
const fs = require("fs");
const path = require("path");

const downloadDir = path.join(__dirname, "../downloads");

async function downloadFacebook(url) {
  const outputPath = path.join(downloadDir, `fb_${Date.now()}.mp4`);

  const apiRes = await axios.get(`https://api.vytal.dev/fb?url=${encodeURIComponent(url)}`);
  const mediaUrl = apiRes.data.hd || apiRes.data.sd;

  if (!mediaUrl) throw new Error("Facebook Video URL မရှာတွေ့ပါ။");

  const response = await axios({ method: "GET", url: mediaUrl, responseType: "stream" });
  const writer = fs.createWriteStream(outputPath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", () => resolve(outputPath));
    writer.on("error", reject);
  });
}

module.exports = { downloadFacebook };
