const fs = require("fs");

function autoDelete(filePath) {

  const ONE_HOUR = 60 * 60 * 1000;

  setTimeout(() => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log("Deleted:", filePath);
      }
    } catch (err) {
      console.log(err);
    }
  }, ONE_HOUR);

}

module.exports = { autoDelete };
