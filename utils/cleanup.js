const fs = require("fs");

function autoDelete(filePath) {
  setTimeout(() => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log("Deleted:", filePath);
      }
    } catch (err) {
      console.log(err);
    }
  }, 60 * 60 * 1000); // 1 hour
}

module.exports = { autoDelete };
