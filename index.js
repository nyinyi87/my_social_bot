const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const fs = require("fs");

const { downloadVideo, downloadMP3 } = require("./utils/youtube");
const { downloadFacebook } = require("./utils/facebook");
const { downloadInstagram } = require("./utils/instagram");
require("./utils/cleanup");

const app = express();

const bot = new TelegramBot(process.env.BOT_TOKEN, {
  polling: true
});

// =========================
// Back4App Server
// =========================

app.get("/", (req, res) => {
  res.send("Telegram Downloader Bot Running ✅");
});

app.listen(process.env.PORT || 3000);

// =========================
// User Data
// =========================

let userLink = {};
let language = {};

// =========================
// START COMMAND
// =========================

bot.onText(/\/start/, (msg) => {

  bot.sendMessage(
    msg.chat.id,
    "🌐 Choose Language / ဘာသာစကားရွေးပါ",
    {
      reply_markup: {
        inline_keyboard: [[
          {
            text: "🇲🇲 မြန်မာ",
            callback_data: "mm"
          },
          {
            text: "🇺🇸 English",
            callback_data: "en"
          }
        ]]
      }
    }
  );

});

// =========================
// HELP
// =========================

bot.onText(/\/help/, (msg) => {

  bot.sendMessage(
    msg.chat.id,
    `📚 အသုံးပြုပုံ

1. /start နှိပ်ပါ။
2. Language ရွေးပါ။
3. Link ပို့ပါ။
4. Quality ရွေးပါ။
5. Download ပြုလုပ်ပါ။`
  );

});

// =========================
// ABOUT
// =========================

bot.onText(/\/about/, (msg) => {

  bot.sendMessage(
    msg.chat.id,
`🤖 Telegram Downloader Bot

Supports:
• YouTube
• Facebook
• Instagram

Video / MP3 / Photo Downloader

Bot ကိုအသုံးပြုသည့်အတွက် ကျေးဇူးတင်ပါသည်။`
  );

});

// =========================
// LINK DETECT
// =========================

bot.on("message", (msg) => {

  if (!msg.text) return;

  const url = msg.text;

  // YouTube
  if (
    url.includes("youtube.com") ||
    url.includes("youtu.be")
  ) {
    userLink[msg.chat.id] = {
      type: "youtube",
      url
    };
  }

  // Facebook
  if (url.includes("facebook.com")) {
    userLink[msg.chat.id] = {
      type: "facebook",
      url
    };
  }

  // Instagram
  if (url.includes("instagram.com")) {
    userLink[msg.chat.id] = {
      type: "instagram",
      url
    };
  }

  if (userLink[msg.chat.id]) {

    bot.sendMessage(
      msg.chat.id,
      "📥 Quality ရွေးပါ",
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

// =========================
// CALLBACK QUERY
// =========================

bot.on("callback_query", async (query) => {

  const chatId = query.message.chat.id;
  const name = query.from.first_name;

  // Myanmar
  if (query.data === "mm") {

    language[chatId] = "mm";

    return bot.sendMessage(
      chatId,
`မင်္ဂလာပါ ${name}

YouTube, Facebook နှင့် Instagram Video Link ပို့ပေးပါ။`
    );

  }

  // English
  if (query.data === "en") {

    language[chatId] = "en";

    return bot.sendMessage(
      chatId,
`Hello ${name}

Send YouTube, Facebook or Instagram Video Link.`
    );

  }

  const quality = query.data;
  const data = userLink[chatId];

  if (!data) return;

  const loading = await bot.sendMessage(
    chatId,
    "⏳ Downloading..."
  );

  try {

    // =========================
    // FACEBOOK
    // =========================

    if (data.type === "facebook") {

      const video = await downloadFacebook(data.url);

      await bot.sendVideo(chatId, video, {
        caption:
`📥 Facebook Download Complete

Bot ကိုအသုံးပြုသည့်အတွက် ကျေးဇူးတင်ပါသည်။`
      });

      fs.unlinkSync(video);

      return;
    }

    // =========================
    // INSTAGRAM
    // =========================

    if (data.type === "instagram") {

      const media = await downloadInstagram(data.url);

      await bot.sendVideo(chatId, media, {
        caption:
`📥 Instagram Download Complete

Bot ကိုအသုံးပြုသည့်အတွက် ကျေးဇူးတင်ပါသည်။`
      });

      fs.unlinkSync(media);

      return;
    }

    // =========================
    // YOUTUBE MP3
    // =========================

    if (quality === "mp3") {

      const audio = await downloadMP3(data.url);

      await bot.sendAudio(chatId, audio, {
        caption:
`🎵 MP3 Download Complete

Bot ကိုအသုံးပြုသည့်အတွက် ကျေးဇူးတင်ပါသည်။`
      });

      fs.unlinkSync(audio);

      return;
    }

    // =========================
    // YOUTUBE VIDEO
    // =========================

    const video = await downloadVideo(data.url, quality);

    const size = fs.statSync(video).size;

    // 50MB အောက်
    if (size <= 50 * 1024 * 1024) {

      await bot.sendVideo(chatId, video, {
        caption:
`🎬 ${quality} Download Complete

Bot ကိုအသုံးပြုသည့်အတွက် ကျေးဇူးတင်ပါသည်။`
      });

    }

    // 50MB အထက်
    else {

      const fileName = video.split("/").pop();

      const link =
        `${process.env.BASE_URL}/downloads/${fileName}`;

      await bot.sendMessage(
        chatId,
`📦 Video Size 50MB ကျော်နေပါတယ်။

⬇️ Direct Download Link

${link}

Chrome ထဲဖွင့်လိုက်ရင် Auto Download စပါမယ်။`
      );

    }

    fs.unlinkSync(video);

    bot.editMessageText(
      "✅ Download Completed",
      {
        chat_id: chatId,
        message_id: loading.message_id
      }
    );

  } catch (e) {

    console.log(e);

    bot.sendMessage(
      chatId,
      "❌ Download Failed\nLink မှန်မမှန် စစ်ပြီး ထပ်ပို့ပါ။"
    );

  }

});
