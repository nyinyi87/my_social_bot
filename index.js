const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const fs = require("fs");

const { downloadVideo, downloadMP3 } = require("./utils/youtube");
const { downloadFacebook } = require("./utils/facebook");
const { downloadInstagram } = require("./utils/instagram");

const app = express();
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

app.get("/", (req, res) => {
  res.send("Telegram Downloader Bot Running");
});

app.listen(process.env.PORT || 3000);

// User Link သိမ်းရန်
let userLink = {};

// /start
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
    "🌐 Choose Language / ဘာသာစကားရွေးပါ",
    {
      reply_markup: {
        inline_keyboard: [[
          { text: "🇲🇲 မြန်မာ", callback_data: "mm" },
          { text: "🇺🇸 English", callback_data: "en" }
        ]]
      }
    }
  );
});

// Language
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const name = query.from.first_name;

  // Language
  if (query.data === "mm") {
    return bot.sendMessage(chatId,
      `မင်္ဂလာပါ ${name}

YouTube, Facebook နှင့် Instagram Link ပို့ပေးပါ။`);
  }

  if (query.data === "en") {
    return bot.sendMessage(chatId,
      `Hello ${name}

Send YouTube, Facebook or Instagram Link.`);
  }

  // Download Quality
  const quality = query.data;
  const data = userLink[chatId];

  if (!data) return;

  bot.sendMessage(chatId, "⏳ Downloading...");

  try {

    // Facebook
    if (data.type === "facebook") {
      const video = await downloadFacebook(data.url);

      await bot.sendVideo(chatId, video, {
        caption: "Bot ကိုအသုံးပြုသည့်အတွက် ကျေးဇူးတင်ပါသည်။"
      });

      fs.unlinkSync(video);
      return;
    }

    // Instagram
    if (data.type === "instagram") {
      const media = await downloadInstagram(data.url);

      await bot.sendVideo(chatId, media, {
        caption: "Bot ကိုအသုံးပြုသည့်အတွက် ကျေးဇူးတင်ပါသည်။"
      });

      fs.unlinkSync(media);
      return;
    }

    // YouTube MP3
    if (quality === "mp3") {
      const audio = await downloadMP3(data.url);

      await bot.sendAudio(chatId, audio, {
        caption: "Bot ကိုအသုံးပြုသည့်အတွက် ကျေးဇူးတင်ပါသည်။"
      });

      fs.unlinkSync(audio);
      return;
    }

    // YouTube Video
    const video = await downloadVideo(data.url, quality);

    await bot.sendVideo(chatId, video, {
      caption: `🎬 ${quality} Download Complete

Bot ကိုအသုံးပြုသည့်အတွက် ကျေးဇူးတင်ပါသည်။`
    });

    fs.unlinkSync(video);

  } catch (err) {
    console.log(err);
    bot.sendMessage(chatId, "❌ Download Failed");
  }

});

// Link Detect
bot.on("message", (msg) => {

  if (!msg.text) return;

  const url = msg.text;

  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    userLink[msg.chat.id] = {
      type: "youtube",
      url
    };
  }

  if (url.includes("facebook.com")) {
    userLink[msg.chat.id] = {
      type: "facebook",
      url
    };
  }

  if (url.includes("instagram.com")) {
    userLink[msg.chat.id] = {
      type: "instagram",
      url
    };
  }

  if (userLink[msg.chat.id]) {
    bot.sendMessage(msg.chat.id,
      "📥 Quality ရွေးပါ။",
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
