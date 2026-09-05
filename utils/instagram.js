const axios = require("axios");
const fs = require("fs");
const path = require("path");

const downloadDir = path.join(__dirname, "../downloads");

async function downloadInstagram(url) {
  const outputPath = path.join(downloadDir, `ig_${Date.now()}.mp4`);

  const apiRes = await axios.get(`https://api.vytal.dev/instagram?url=${encodeURIComponent(url)}`);
  const mediaUrl = apiRes.data.url || (apiRes.data.data && apiRes.data.data[0].url);

  if (!mediaUrl) throw new Error("Instagram Media URL မရှာတွေ့ပါ။");

  const response = await axios({ method: "GET", url: mediaUrl, responseType: "stream" });
  const writer = fs.createWriteStream(outputPath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", () => resolve(outputPath));
    writer.on("error", reject);
  });
}

module.exports = { downloadInstagram };
