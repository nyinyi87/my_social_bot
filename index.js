const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const path = require("path");

const { downloadVideo, downloadMP3 } = require("./utils/youtube");
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
app.use("/download", express.static(path.join(__dirname, "downloads")));

app.get("/", (req, res) => {
  res.send("✅ Social Downloader Bot Running");
});

app.listen(PORT);

const LIMIT = 50 * 1024 * 1024;
const users = {};
const userLinks = {};

// ===== START MENU =====
bot.onText(/\/start/, (msg) => {
  const name = msg.from.first_name;

  bot.sendMessage(
    msg.chat.id,
    `👋 မင်္ဂလာပါ ${name}

📥 YouTube • Facebook • Instagram Downloader Bot

ဘာသာစကားရွေးပါ / Choose Language`,
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

// ===== MESSAGE EVENT =====
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text) return;

  // Language
  if (text === "🇲🇲 မြန်မာ") {
    users[chatId] = "mm";
    return bot.sendMessage(
      chatId,
      `✅ မြန်မာဘာသာ ရွေးပြီးပါပြီ။

YouTube / Facebook / Instagram Link ပို့ပေးပါ။`
    );
  }

  if (text === "🇬🇧 English") {
    users[chatId] = "en";
    return bot.sendMessage(
      chatId,
      `✅ English Selected.

Send YouTube / Facebook / Instagram Link.`
    );
  }

  // Help
  if (text === "❓ Help") {
    return bot.sendMessage(
      chatId,
`📖 အသုံးပြုနည်း

1. YouTube / Facebook / Instagram Link ပို့ပါ။
2. Video Quality (144p–1080p) ရွေးပါ။
3. MP3 သို့ Photo ကိုလည်း ရွေးနိုင်ပါတယ်။`
    );
  }

  // About
  if (text === "ℹ️ About") {
    return bot.sendMessage(
      chatId,
`📥 Social Downloader Bot

Version 2.0

Developer : @nyi

Supports:
• YouTube
• Facebook
• Instagram`
    );
  }

  // Download Menu
  if (text === "📥 Download") {
    return bot.sendMessage(chatId, "📎 Link ပို့ပေးပါ။");
  }

  // URL Check
  if (!text.startsWith("http")) return;

  userLinks[chatId] = text;

  // ===== YouTube Menu =====
  if (text.includes("youtube.com") || text.includes("youtu.be")) {
    return bot.sendMessage(chatId, "🎬 YouTube Downloader\nQuality ရွေးပါ။", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "144p", callback_data: "yt_144" }, { text: "240p", callback_data: "yt_240" }],
          [{ text: "360p", callback_data: "yt_360" }, { text: "480p", callback_data: "yt_480" }],
          [{ text: "720p HD", callback_data: "yt_720" }, { text: "1080p FHD", callback_data: "yt_1080" }],
          [{ text: "🎵 MP3", callback_data: "yt_mp3" }]
        ]
      }
    });
  }

  // ===== Facebook Menu =====
  if (text.includes("facebook.com") || text.includes("fb.watch")) {
    return bot.sendMessage(chatId, "📘 Facebook Downloader\nOption ရွေးပါ။", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "144p", callback_data: "fb_144" }, { text: "240p", callback_data: "fb_240" }],
          [{ text: "360p", callback_data: "fb_360" }, { text: "480p", callback_data: "fb_480" }],
          [{ text: "720p HD", callback_data: "fb_720" }, { text: "1080p FHD", callback_data: "fb_1080" }],
          [{ text: "🖼 Photo", callback_data: "fb_photo" }],
          [{ text: "🎵 MP3", callback_data: "fb_mp3" }]
        ]
      }
    });
  }

  // ===== Instagram Menu =====
  if (text.includes("instagram.com")) {
    return bot.sendMessage(chatId, "📸 Instagram Downloader\nOption ရွေးပါ။", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "144p", callback_data: "ig_144" }, { text: "240p", callback_data: "ig_240" }],
          [{ text: "360p", callback_data: "ig_360" }, { text: "480p", callback_data: "ig_480" }],
          [{ text: "720p HD", callback_data: "ig_720" }, { text: "1080p FHD", callback_data: "ig_1080" }],
          [{ text: "🖼 Photo", callback_data: "ig_photo" }],
          [{ text: "🎵 MP3", callback_data: "ig_mp3" }]
        ]
      }
    });
  }
});
// ================================
// CALLBACK QUERY
// ================================

bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const action = query.data;
  const url = userLinks[chatId];

  await bot.answerCallbackQuery(query.id);

  if (!url) {
    return bot.sendMessage(chatId, "❌ Link မတွေ့ပါ။ Link ပြန်ပို့ပါ။");
  }

  bot.sendMessage(chatId, "⏳ Downloading...");

  try {
    let result;

    // ---------------- YOUTUBE ----------------

    if (action.startsWith("yt_")) {
      const quality = action.replace("yt_", "");

      if (quality === "mp3") {
        result = await downloadMP3(url);

        if (result.size > LIMIT) {
          return bot.sendMessage(
            chatId,
            `🎵 MP3 Direct Link\n\n${BASE_URL}/download/${result.fileName}`
          );
        }

        await bot.sendAudio(chatId, result.file, {
          caption:
            "Bot ကိုအသုံးပြုသည့်အတွက် ကျေးဇူးတင်ပါသည်။\n\nDownloaded by @nyi"
        });

        autoDelete(result.file);
        return;
      }

      result = await downloadVideo(url, quality);

      if (result.size > LIMIT) {
        return bot.sendMessage(
          chatId,
          `📥 YouTube ${quality}p Direct Link\n\n${BASE_URL}/download/${result.fileName}`
        );
      }

      await bot.sendVideo(chatId, result.file, {
        caption:
          `🎬 YouTube ${quality}p\n\nBot ကိုအသုံးပြုသည့်အတွက် ကျေးဇူးတင်ပါသည်။\n\nDownloaded by @nyi`
      });

      autoDelete(result.file);
      return;
    }

    // ---------------- FACEBOOK ----------------

    if (action.startsWith("fb_")) {
      const quality = action.replace("fb_", "");

      if (quality === "photo") {
        const photos = await downloadFacebookPhoto(url);

        for (const photo of photos.photos) {
          await bot.sendPhoto(chatId, photo, {
            caption: "📘 Facebook Photo\n\nDownloaded by @nyi"
          });
        }
        return;
      }

      if (quality === "mp3") {
        result = await downloadFacebookMP3(url);

        if (result.size > LIMIT) {
          return bot.sendMessage(
            chatId,
            `🎵 Facebook MP3 Direct Link\n\n${BASE_URL}/download/${result.fileName}`
          );
        }

        await bot.sendAudio(chatId, result.file, {
          caption: "Downloaded by @nyi"
        });

        autoDelete(result.file);
        return;
      }

      result = await downloadFacebook(url, quality);

      if (result.size > LIMIT) {
        return bot.sendMessage(
          chatId,
          `📘 Facebook ${quality}p Direct Link\n\n${BASE_URL}/download/${result.fileName}`
        );
      }

      await bot.sendVideo(chatId, result.file, {
        caption:
          `📘 Facebook ${quality}p\n\nBot ကိုအသုံးပြုသည့်အတွက် ကျေးဇူးတင်ပါသည်။\n\nDownloaded by @nyi`
      });

      autoDelete(result.file);
      return;
    }

    // ---------------- INSTAGRAM ----------------

    if (action.startsWith("ig_")) {
      const quality = action.replace("ig_", "");

      if (quality === "photo") {
        const photos = await downloadInstagramPhoto(url);

        for (const photo of photos.photos) {
          await bot.sendPhoto(chatId, photo, {
            caption: "📸 Instagram Photo\n\nDownloaded by @nyi"
          });
        }
        return;
      }

      if (quality === "mp3") {
        result = await downloadInstagramMP3(url);

        if (result.size > LIMIT) {
          return bot.sendMessage(
            chatId,
            `🎵 Instagram MP3 Direct Link\n\n${BASE_URL}/download/${result.fileName}`
          );
        }

        await bot.sendAudio(chatId, result.file, {
          caption: "Downloaded by @nyi"
        });

        autoDelete(result.file);
        return;
      }

      result = await downloadInstagram(url, quality);

      if (result.size > LIMIT) {
        return bot.sendMessage(
          chatId,
          `📸 Instagram ${quality}p Direct Link\n\n${BASE_URL}/download/${result.fileName}`
        );
      }

      await bot.sendVideo(chatId, result.file, {
        caption:
          `📸 Instagram ${quality}p\n\nBot ကိုအသုံးပြုသည့်အတွက် ကျေးဇူးတင်ပါသည်။\n\nDownloaded by @nyi`
      });

      autoDelete(result.file);
      return;
    }

  } catch (err) {
    console.error("Download Error:", err);

    bot.sendMessage(
      chatId,
      `❌ Download Failed!\n\n${err.message}`
    );
  }
});

// ================================
// ERROR HANDLER
// ================================

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
