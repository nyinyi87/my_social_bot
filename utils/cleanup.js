const fs = require("fs");

function autoDelete(filePath) {
  setTimeout(() => {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log("Deleted:", filePath);
    }
  }, 60 * 60 * 1000); // 1 hour
}

module.exports = { autoDelete };
