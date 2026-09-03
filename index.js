const { downloadVideo, downloadMP3 } = require("./utils/youtube");
const fs = require("fs");
const { downloadFacebook } = require("./utils/facebook");
const { downloadInstagram } = require("./utils/instagram");
const TelegramBot = require("node-telegram-bot-api");
const express = require("express");

const app = express();
const TOKEN = process.env.BOT_TOKEN;

const bot = new TelegramBot(TOKEN, { polling: true });

// Web server (Back4App)
app.get("/", (req, res) => {
  res.send("Telegram Downloader Bot Running");
});

app.listen(process.env.PORT || 3000);

// /start
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
    "🌐 Choose Language / ဘာသာစကားရွေးပါ",
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🇲🇲 မြန်မာ", callback_data: "mm" },
            { text: "🇺🇸 English", callback_data: "en" }
          ]
        ]
      }
    }
  );
});

// Language
bot.on("let userLink = {};

bot.on("message", (msg) => {

  if (!msg.text) return;

  if (
    msg.text.includes("youtube.com") ||
    msg.text.includes("youtu.be")
  ) {

    userLink[msg.chat.id] = msg.text;

    bot.sendMessage(msg.chat.id,
      "🎬 Video Quality ရွေးပါ",
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "144p", callback_data: "144" },
              { text: "240p", callback_data: "240" }
            ],
            [
              { text: "360p", callback_data: "360" },
              { text: "480p", callback_data: "480" }
            ],
            [
              { text: "720p", callback_data: "720" },
              { text: "1080p", callback_data: "1080" }
            ],
            [
              { text: "🎵 MP3", callback_data: "mp3" }
            ]
          ]
        }
      });
  }

});", (query) => {
  const chatId = query.message.chat.id;
  const name = query.from.first_name;

  if (query.data === "mm") {
    bot.sendMessage(chatId,
      `မင်္ဂလာပါ ${name}

YouTube, Facebook နှင့် Instagram Video Link ပို့ပေးပါ။`);
  }

  if (query.data === "en") {
    bot.sendMessage(chatId,
      `Hello ${name}

Send YouTube, Facebook or Instagram video link.`);
  }
});

// Link Detect
bot.on("message", (msg) => {
  if (!msg.text) return;

  const url = msg.text;

  if (
    url.includes("youtube.com") ||
    url.includes("youtu.be") ||
    url.includes("facebook.com") ||
    url.includes("instagram.com")
  ) {
    bot.sendMessage(
      msg.chat.id,
      "📥 Downloading...\n\nQuality ရွေးပါ။",
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "144p", callback_data: "144" },
              { text: "240p", callback_data: "240" }
            ],
            [
              { text: "360p", callback_data: "360" },
              { text: "480p", callback_data: "480" }
            ],
            [
              { text: "720p", callback_data: "720" },
              { text: "1080p", callback_data: "1080" }
            ],
            [
              { text: "🎵 MP3", callback_data: "mp3" }
            ]
          ]
        }
      }
    );
  }
});
