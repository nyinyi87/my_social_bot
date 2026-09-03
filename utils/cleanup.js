const cron = require("node-cron");
const fs = require("fs");
const path = require("path");

const folder = "./downloads";

cron.schedule("*/10 * * * *", () => {

  const files = fs.readdirSync(folder);

  files.forEach(file => {

    const filePath = path.join(folder, file);

    const age = Date.now() - fs.statSync(filePath).mtimeMs;

    if (age > 60 * 60 * 1000) {
      fs.unlinkSync(filePath);
      console.log(`${file} deleted`);
    }

  });

});
