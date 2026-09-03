const cron = require("node-cron");
const fs = require("fs");

cron.schedule("0 * * * *", () => {

  if (!fs.existsSync("./downloads")) return;

  const files = fs.readdirSync("./downloads");

  files.forEach(file => {
    const path = `./downloads/${file}`;
    const age = Date.now() - fs.statSync(path).mtimeMs;

    if (age > 3600000) {
      fs.unlinkSync(path);
    }
  });

});
