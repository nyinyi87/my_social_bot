const TelegramBot = require("node-telegram-bot-api");
const express = require("express");

const { downloadVideo, downloadMP3 } = require("./utils/youtube");
const { downloadFacebook } = require("./utils/facebook");
const { downloadInstagram } = require("./utils/instagram");

const app = express();
app.use(express.json());

const bot = new TelegramBot(process.env.BOT_TOKEN);

const PORT = process.env.PORT || 3000;

let userLink = {};

// Telegram Webhook
app.post("/webhook", (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Health Check
app.get("/", (req, res) => {
  res.send("Bot Running ✅");
});

app.listen(PORT, async () => {
  console.log("Server Started");
});

// START
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
    `🌐 ဘာသာစကားရွေးပါ`,
    {
      reply_markup: {
        inline_keyboard: [[
          { text: "🇲🇲 မြန်မာ", callback_data: "mm" },
          { text: "🇺🇸 English", callback_data: "en" }
        ]]
      }
    });
});

// Link Detect
bot.on("message", (msg) => {
  if (!msg.text) return;

  const url = msg.text;

  if (url.includes("youtu")) {
    userLink[msg.chat.id] = { type: "youtube", url };
  }

  if (url.includes("facebook.com")) {
    userLink[msg.chat.id] = { type: "facebook", url };
  }

  if (url.includes("instagram.com")) {
    userLink[msg.chat.id] = { type: "instagram", url };
  }

  if (userLink[msg.chat.id]) {
    bot.sendMessage(msg.chat.id,
      "📥 Quality ရွေးပါ",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "144p", callback_data: "144" }],
            [{ text: "360p", callback_data: "360" }],
            [{ text: "720p", callback_data: "720" }],
            [{ text: "1080p", callback_data: "1080" }],
            [{ text: "🎵 MP3", callback_data: "mp3" }]
          ]
        }
      });
  }
});

// Download
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = userLink[chatId];
  if (!data) return;

  if (query.data === "mm") {
    return bot.sendMessage(chatId, "မင်္ဂလာပါ Link ပို့ပါ။");
  }

  if (query.data === "en") {
    return bot.sendMessage(chatId, "Hello, send a link.");
  }

  try {
    if (data.type === "youtube") {
      if (query.data === "mp3") {
        const audio = await downloadMP3(data.url);
        await bot.sendAudio(chatId, audio, {
          caption: "Bot ကိုအသုံးပြုသည့်အတွက် ကျေးဇူးတင်ပါသည်။"
        });
      } else {
        const video = await downloadVideo(data.url, query.data);
        await bot.sendVideo(chatId, video, {
          caption: "Bot ကိုအသုံးပြုသည့်အတွက် ကျေးဇူးတင်ပါသည်။"
        });
      }
    }

    if (data.type === "facebook") {
      const video = await downloadFacebook(data.url);
      await bot.sendVideo(chatId, video);
    }

    if (data.type === "instagram") {
      const video = await downloadInstagram(data.url);
      await bot.sendVideo(chatId, video);
    }

  } catch (err) {
    bot.sendMessage(chatId, "❌ Download Failed");
  }
});
