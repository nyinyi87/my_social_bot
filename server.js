const express = require("express");
const path = require("path");

const app = express();

// Static file hosting for downloads
app.use("/downloads", express.static(path.join(__dirname, "downloads")));

app.get("/", (req, res) => {
  res.send("Downloader Bot Server is running!");
});

module.exports = app;
