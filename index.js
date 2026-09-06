const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const path = require("path");

const { downloadVideo, downloadMP3 } = require("./utils/youtube");
const { downloadFacebook } = require("./utils/facebook");
const { downloadInstagram } = require("./utils/instagram");
const { autoDelete } = require("./utils/cleanup");

const TOKEN = process.env.BOT_TOKEN;
const BASE_URL = process.env.BASE_URL;

const bot = new TelegramBot(TOKEN, { polling: true });

const app = express();
app.use("/download", express.static(path.join(__dirname, "downloads")));
app.get("/", (req, res) => res.send("Telegram Downloader Bot Running"));
app.listen(process.env.PORT || 3000);

const users = {};
const userLinks = {};
const LIMIT = 50 * 1024 * 1024; // 50MB

// START
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "🌍 Choose Language / ဘာသာစကားရွေးပါ",
    {
      reply_markup: {
        keyboard: [["🇬🇧 English"], ["🇲🇲 မြန်မာ"]],
        resize_keyboard: true,
      },
    }
  );
});

// MESSAGE
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text === "🇬🇧 English") {
    users[chatId] = "en";
    return bot.sendMessage(
      chatId,
      `Hello ${msg.from.first_name}!\nSend YouTube, Facebook or Instagram link.`
    );
  }

  if (text === "🇲🇲 မြန်မာ") {
    users[chatId] = "mm";
    return bot.sendMessage(
      chatId,
      `မင်္ဂလာပါ ${msg.from.first_name}!\nYouTube၊ Facebook နှင့် Instagram Link ပို့ပေးပါ။`
    );
  }

  if (!text || !text.startsWith("http")) return;

  // YouTube
  if (text.includes("youtube.com") || text.includes("youtu.be")) {
    userLinks[chatId] = text;

    return bot.sendMessage(chatId, "🎬 Quality ရွေးပါ", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "144p", callback_data: "144" }, { text: "240p", callback_data: "240" }],
          [{ text: "360p", callback_data: "360" }, { text: "480p", callback_data: "480" }],
          [{ text: "720p", callback_data: "720" }, { text: "1080p", callback_data: "1080" }],
          [{ text: "🎵 MP3", callback_data: "mp3" }],
        ],
      },
    });
  }

  // Facebook
  if (text.includes("facebook.com") || text.includes("fb.watch")) {
    bot.sendMessage(chatId, "⏳ Facebook Video Downloading...");

    const data = await downloadFacebook(text);
    if (data.size > LIMIT) {
      bot.sendMessage(chatId, `📥 Direct Link:\n${BASE_URL}/download/${data.fileName}`);
    } else {
      bot.sendVideo(chatId, data.file, {
        caption: "Bot ကိုအသုံးပြုသည့်အတွက် ကျေးဇူးတင်ပါသည်။\nDownloaded by @nyi",
      });
    }
    autoDelete(data.file);
  }

  // Instagram
  if (text.includes("instagram.com")) {
    bot.sendMessage(chatId, "⏳ Instagram Downloading...");

    const data = await downloadInstagram(text);
    if (data.size > LIMIT) {
      bot.sendMessage(chatId, `📥 Direct Link:\n${BASE_URL}/download/${data.fileName}`);
    } else {
      bot.sendVideo(chatId, data.file, {
        caption: "Bot ကိုအသုံးပြုသည့်အတွက် ကျေးဇူးတင်ပါသည်။\nDownloaded by @nyi",
      });
    }
    autoDelete(data.file);
  }
});
// YouTube Quality & MP3 Callback
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

    // MP3
    if (query.data === "mp3") {
      data = await downloadMP3(url);

      if (data.size > LIMIT) {
        const link = `${BASE_URL}/download/${data.fileName}`;
        bot.sendMessage(chatId, `📥 MP3 Direct Link\n${link}`);
      } else {
        await bot.sendAudio(chatId, data.file, {
          caption:
            "Bot ကိုအသုံးပြုသည့်အတွက် ကျေးဇူးတင်ပါသည်။\nDownloaded by @nyi"
        });
      }

      autoDelete(data.file);
      return;
    }

    // Video (144p - 1080p)
    data = await downloadVideo(url, query.data);

    if (data.size > LIMIT) {
      const link = `${BASE_URL}/download/${data.fileName}`;

      bot.sendMessage(
        chatId,
        `📥 Video သည် 50MB ထက်ကြီးပါသည်။\nDirect Link:\n${link}`
      );
    } else {
      await bot.sendVideo(chatId, data.file, {
        caption:
          "Bot ကိုအသုံးပြုသည့်အတွက် ကျေးဇူးတင်ပါသည်။\nDownloaded by @nyi"
      });
    }

    autoDelete(data.file);

  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, "❌ Download မအောင်မြင်ပါ။ Link ကိုပြန်စစ်ပြီး ထပ်ပို့ပါ။");
  }
});

// Error Handler
bot.on("polling_error", (err) => {
  console.log("Polling Error:", err.message);
});

console.log("✅ Telegram Downloader Bot Started");
