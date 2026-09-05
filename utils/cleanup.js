const fs = require("fs");
const path = require("path");

const downloadDir = path.join(__dirname, "../downloads");

// နာရီဝက် (30 Mins) တိုင်း ၁ နာရီထက်ကြာသော ဖိုင်များကို ဖျက်မည်
setInterval(() => {
  if (!fs.existsSync(downloadDir)) return;

  fs.readdir(downloadDir, (err, files) => {
    if (err) return;

    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    files.forEach((file) => {
      if (file === ".gitkeep") return; // .gitkeep ဖိုင်ကို မဖျက်ရန်
      
      const filePath = path.join(downloadDir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) return;
        if (now - stats.mtimeMs > oneHour) {
          fs.unlink(filePath, () => {});
        }
      });
    });
  });
}, 30 * 60 * 1000);
