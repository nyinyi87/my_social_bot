const cron = require("node-cron");
const fs = require("fs");
const path = require("path");

cron.schedule("*/10 * * * *", () => {

  if (!fs.existsSync("./downloads")) return;

  const files = fs.readdirSync("./downloads");

  files.forEach(file => {

    const filePath = path.join("./downloads", file);

    const age =
      Date.now() - fs.statSync(filePath).mtimeMs;

    if (age > 3600000) {
      fs.unlinkSync(filePath);
    }

  });

});
