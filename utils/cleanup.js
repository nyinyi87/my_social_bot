const cron = require("node-cron");
const fs = require("fs");
const path = require("path");

const folder = path.join(__dirname, "../downloads");

if (!fs.existsSync(folder)) {
  fs.mkdirSync(folder, { recursive: true });
}

// ၁၀ မိနစ်တစ်ကြိမ် စစ်ဆေးပြီး ၁ နာရီကျော်သော ဖိုင်များကို ဖျက်မည်
cron.schedule("*/10 * * * *", () => {
  try {
    const files = fs.readdirSync(folder);
    files.forEach((file) => {
      const filePath = path.join(folder, file);
      const age = Date.now() - fs.statSync(filePath).mtimeMs;

      if (age > 60 * 60 * 1000) {
        fs.unlinkSync(filePath);
        console.log(`[Auto Cleanup] ${file} deleted.`);
      }
    });
  } catch (error) {
    console.error("Cleanup Error:", error);
  }
});
