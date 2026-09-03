const express = require("express");
const path = require("path");

const app = express();

// downloads folder ကို public လုပ်ပေးမယ်
app.use("/downloads", express.static(path.join(__dirname, "downloads")));

app.get("/", (req, res) => {
  res.send("Downloader Server Running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
