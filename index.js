const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const path = require("path");

const {
  downloadVideo,
  downloadMP3
} = require("./utils/youtube");

const {
  downloadFacebook,
  downloadFacebookMP3,
  downloadFacebookPhoto
} = require("./utils/facebook");

const {
  downloadInstagram,
  downloadInstagramMP3,
  downloadInstagramPhoto
} = require("./utils/instagram");

const { autoDelete } = require("./utils/cleanup");

const TOKEN = process.env.BOT_TOKEN;
const BASE_URL = process.env.BASE_URL;
const PORT = process.env.PORT || 3000;

const bot = new TelegramBot(TOKEN, { polling: true });

const app = express();

app.use(
  "/download",
  express.static(path.join(__dirname, "downloads"))
);

app.get("/", (req, res) => {
  res.send("Telegram Downloader Bot Running");
});

app.listen(PORT);

const LIMIT = 50 * 1024 * 1024;

const users = {};
const userLinks = {};

// =========================
// START MENU
// =========================

bot.onText(/\/start/, (msg) => {

  const chatId = msg.chat.id;
  const name = msg.from.first_name;

  bot.sendMessage(
    chatId,
`👋 Welcome ${name}

📥 Social Downloader Bot

Please choose language / ဘာသာစကားရွေးပါ`,
    {
      reply_markup: {
        keyboard: [
          ["🇲🇲 မြန်မာ", "🇬🇧 English"],
          ["📥 Download"],
          ["❓ Help", "ℹ️ About"]
        ],
        resize_keyboard: true
      }
    }
  );
});

// =========================
// MESSAGE EVENT
// =========================

bot.on("message", async (msg) => {

  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text) return;

  // -----------------------
  // LANGUAGE
  // -----------------------

  if (text === "🇲🇲 မြန်မာ") {

    users[chatId] = "mm";

    return bot.sendMessage(
      chatId,
`✅ မြန်မာဘာသာရွေးပြီးပါပြီ။

မင်္ဂလာပါ ${msg.from.first_name}

YouTube / Facebook / Instagram Link ပို့ပေးပါ။`
    );

  }

  if (text === "🇬🇧 English") {

    users[chatId] = "en";

    return bot.sendMessage(
      chatId,
`✅ English Selected.

Hello ${msg.from.first_name}

Send YouTube / Facebook / Instagram link.`
    );

  }

  // -----------------------
  // HELP
  // -----------------------

  if (text === "❓ Help") {

    return bot.sendMessage(
      chatId,
`📖 Help

Supported Platforms

• YouTube Video
• YouTube MP3

• Facebook Video
• Facebook Photo
• Facebook MP3

• Instagram Reel
• Instagram Video
• Instagram Photo
• Instagram MP3

How to use?

1. Send Link.
2. Choose Quality.
3. Wait Download.`
    );

  }

  // -----------------------
  // ABOUT
  // -----------------------

  if (text === "ℹ️ About") {

    return bot.sendMessage(
      chatId,
`📥 Social Downloader Bot

Version : 2.0

Supports

YouTube
Facebook
Instagram

Downloaded by @nyi`
    );

  }

  // -----------------------
  // DOWNLOAD BUTTON
  // -----------------------

  if (text === "📥 Download") {

    return bot.sendMessage(
      chatId,
      "📎 Send YouTube / Facebook / Instagram Link."
    );

  }

  // -----------------------
  // URL CHECK
  // -----------------------

  if (!text.startsWith("http")) return;

  userLinks[chatId] = text;

  // ===================================================
  // YOUTUBE MENU
  // ===================================================

  if (
    text.includes("youtube.com") ||
    text.includes("youtu.be")
  ) {

    return bot.sendMessage(
      chatId,
`🎬 YouTube Downloader

Select Quality`,
      {
        reply_markup: {
          inline_keyboard: [

            [
              { text:"144p", callback_data:"yt_144" },
              { text:"240p", callback_data:"yt_240" }
            ],

            [
              { text:"360p", callback_data:"yt_360" },
              { text:"480p", callback_data:"yt_480" }
            ],

            [
              { text:"720p HD", callback_data:"yt_720" },
              { text:"1080p FHD", callback_data:"yt_1080" }
            ],

            [
              { text:"🎵 MP3", callback_data:"yt_mp3" }
            ]

          ]
        }
      }
    );

  }

  // ===================================================
  // FACEBOOK MENU
  // ===================================================

  if (
    text.includes("facebook.com") ||
    text.includes("fb.watch")
  ) {

    return bot.sendMessage(
      chatId,
`📘 Facebook Downloader

Select Option`,
      {
        reply_markup: {
          inline_keyboard: [

            [
              { text:"144p", callback_data:"fb_144" },
              { text:"240p", callback_data:"fb_240" }
            ],

            [
              { text:"360p", callback_data:"fb_360" },
              { text:"480p", callback_data:"fb_480" }
            ],

            [
              { text:"720p HD", callback_data:"fb_720" },
              { text:"1080p FHD", callback_data:"fb_1080" }
            ],

            [
              { text:"🖼 Photo", callback_data:"fb_photo" }
            ],

            [
              { text:"🎵 MP3", callback_data:"fb_mp3" }
            ]

          ]
        }
      }
    );

  }

  // ===================================================
  // INSTAGRAM MENU
  // ===================================================

  if (
    text.includes("instagram.com") ||
    text.includes("instagr.am")
  ) {

    return bot.sendMessage(
      chatId,
`📸 Instagram Downloader

Select Option`,
      {
        reply_markup: {
          inline_keyboard: [

            [
              { text:"144p", callback_data:"ig_144" },
              { text:"240p", callback_data:"ig_240" }
            ],

            [
              { text:"360p", callback_data:"ig_360" },
              { text:"480p", callback_data:"ig_480" }
            ],

            [
              { text:"720p HD", callback_data:"ig_720" },
              { text:"1080p FHD", callback_data:"ig_1080" }
            ],

            [
              { text:"🖼 Photo", callback_data:"ig_photo" }
            ],

            [
              { text:"🎵 MP3", callback_data:"ig_mp3" }
            ]

          ]
        }
      }
    );

  }

});
// ========================================
// CALLBACK QUERY (YouTube/Facebook/Instagram)
// ========================================

bot.on("callback_query", async (query) => {

  const chatId = query.message.chat.id;
  const url = userLinks[chatId];

  if (!url) {
    return bot.answerCallbackQuery(query.id, {
      text: "❌ Link မတွေ့ပါ။"
    });
  }

  await bot.answerCallbackQuery(query.id);

  bot.sendMessage(chatId, "⏳ Downloading...");

  try {

    let data;
    const action = query.data;

    // ------------------ YOUTUBE ------------------

    if (action.startsWith("yt_")) {

      const quality = action.replace("yt_", "");

      if (quality === "mp3") {
        data = await downloadMP3(url);

        if (data.size > LIMIT) {
          await bot.sendMessage(chatId,
            `🎵 MP3 Direct Link\n${BASE_URL}/download/${data.fileName}`);
        } else {
          await bot.sendAudio(chatId, data.file, {
            caption: `Bot ကိုအသုံးပြုသည့်အတွက် ကျေးဇူးတင်ပါသည်။\nDownloaded by @nyi`
          });
        }

        autoDelete(data.file);
        return;
      }

      data = await downloadVideo(url, quality);

      if (data.size > LIMIT) {
        await bot.sendMessage(chatId,
          `📥 YouTube ${quality}p Direct Link\n${BASE_URL}/download/${data.fileName}`);
      } else {
        await bot.sendVideo(chatId, data.file, {
          caption: `🎬 YouTube ${quality}p\n\nBot ကိုအသုံးပြုသည့်အတွက် ကျေးဇူးတင်ပါသည်။\nDownloaded by @nyi`
        });
      }

      autoDelete(data.file);
      return;
    }

    // ------------------ FACEBOOK ------------------

    if (action.startsWith("fb_")) {

      const quality = action.replace("fb_", "");

      if (quality === "photo") {

        const photos = await downloadFacebookPhoto(url);

        for (const photo of photos.photos) {
          await bot.sendPhoto(chatId, photo, {
            caption: `📘 Facebook Photo\nDownloaded by @nyi`
          });
        }

        return;
      }

      if (quality === "mp3") {

        data = await downloadFacebookMP3(url);

        if (data.size > LIMIT) {
          await bot.sendMessage(chatId,
            `🎵 Facebook MP3 Direct Link\n${BASE_URL}/download/${data.fileName}`);
        } else {
          await bot.sendAudio(chatId, data.file, {
            caption: `Downloaded by @nyi`
          });
        }

        autoDelete(data.file);
        return;
      }

      data = await downloadFacebook(url, quality);

      if (data.size > LIMIT) {
        await bot.sendMessage(chatId,
          `📘 Facebook ${quality}p Direct Link\n${BASE_URL}/download/${data.fileName}`);
      } else {
        await bot.sendVideo(chatId, data.file, {
          caption: `📘 Facebook ${quality}p\nDownloaded by @nyi`
        });
      }

      autoDelete(data.file);
      return;
    }

    // ------------------ INSTAGRAM ------------------

    if (action.startsWith("ig_")) {

      const quality = action.replace("ig_", "");

      if (quality === "photo") {

        const photos = await downloadInstagramPhoto(url);

        for (const photo of photos.photos) {
          await bot.sendPhoto(chatId, photo, {
            caption: `📸 Instagram Photo\nDownloaded by @nyi`
          });
        }

        return;
      }

      if (quality === "mp3") {

        data = await downloadInstagramMP3(url);

        if (data.size > LIMIT) {
          await bot.sendMessage(chatId,
            `🎵 Instagram MP3 Direct Link\n${BASE_URL}/download/${data.fileName}`);
        } else {
          await bot.sendAudio(chatId, data.file, {
            caption: `Downloaded by @nyi`
          });
        }

        autoDelete(data.file);
        return;
      }

      data = await downloadInstagram(url, quality);

      if (data.size > LIMIT) {
        await bot.sendMessage(chatId,
          `📸 Instagram ${quality}p Direct Link\n${BASE_URL}/download/${data.fileName}`);
      } else {
        await bot.sendVideo(chatId, data.file, {
          caption: `📸 Instagram ${quality}p\nDownloaded by @nyi`
        });
      }

      autoDelete(data.file);
      return;
    }

  } catch (err) {

    console.log(err);

    bot.sendMessage(chatId,
      "❌ Download Failed!\nLink ကို ပြန်စစ်ပြီး ထပ်ပို့ပါ။");

  }

});

// ========================================
// BOT ERROR HANDLER
// ========================================

bot.on("polling_error", (err) => {
  console.log("Polling Error:", err.message);
});

process.on("uncaughtException", (err) => {
  console.log("Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.log("Unhandled Rejection:", err);
});

console.log("✅ Social Downloader Bot Started");
