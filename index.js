const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const fs = require("fs");
const path = require("path");

const { downloadVideo, downloadMP3 } = require("./utils/youtube");
const { downloadFacebook } = require("./utils/facebook");
const { downloadInstagram } = require("./utils/instagram");
require("./utils/cleanup");

const app = express();

const bot = new TelegramBot(process.env.BOT_TOKEN, {
  polling: true
});

// =========================
// Back4App Server & Static Downloads
// =========================

// 50MB ထက်ကြီးသော File များ Web Link ဖြင့် ဒေါင်းလုဒ်ဆွဲနိုင်ရန် Downloads Folder လမ်းကြောင်းဖွင့်ခြင်း
app.use("/downloads", express.static(path.join(__dirname, "downloads")));

app.get("/", (req, res) => {
  res.send("Telegram Downloader Bot Running ✅");
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on port ${process.env.PORT || 3000}`);
});

// =========================
// User Data Memory
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
  if (!msg.text || msg.text.startsWith("/")) return;

  const url = msg.text.trim();

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
  if (url.includes("facebook.com") || url.includes("fb.watch")) {
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

  // Telegram Button Loading Spinner ကို ပိတ်ခြင်း
  await bot.answerCallbackQuery(query.id).catch(() => {});

  // Myanmar Language
  if (query.data === "mm") {
    language[chatId] = "mm";
    return bot.sendMessage(
      chatId,
      `မင်္ဂလာပါ ${name}\n\nYouTube, Facebook နှင့် Instagram Video Link ပို့ပေးပါ။`
    );
  }

  // English Language
  if (query.data === "en") {
    language[chatId] = "en";
    return bot.sendMessage(
      chatId,
      `Hello ${name}\n\nSend YouTube, Facebook or Instagram Video Link.`
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
        caption: `📥 Facebook Download Complete\n\nBot ကိုအသုံးပြုသည့်အတွက် ကျေးဇူးတင်ပါသည်။`
      });

      if (fs.existsSync(video)) fs.unlinkSync(video);
      delete userLink[chatId];

      bot.editMessageText("✅ Download Completed", {
        chat_id: chatId,
        message_id: loading.message_id
      }).catch(() => {});

      return;
    }

    // =========================
    // INSTAGRAM
    // =========================
    if (data.type === "instagram") {
      const media = await downloadInstagram(data.url);

      await bot.sendVideo(chatId, media, {
        caption: `📥 Instagram Download Complete\n\nBot ကိုအသုံးပြုသည့်အတွက် ကျေးဇူးတင်ပါသည်။`
      });

      if (fs.existsSync(media)) fs.unlinkSync(media);
      delete userLink[chatId];

      bot.editMessageText("✅ Download Completed", {
        chat_id: chatId,
        message_id: loading.message_id
      }).catch(() => {});

      return;
    }

    // =========================
    // YOUTUBE MP3
    // =========================
    if (quality === "mp3") {
      const audio = await downloadMP3(data.url);

      await bot.sendAudio(chatId, audio, {
        caption: `🎵 MP3 Download Complete\n\nBot ကိုအသုံးပြုသည့်အတွက် ကျေးဇူးတင်ပါသည်။`
      });

      if (fs.existsSync(audio)) fs.unlinkSync(audio);
      delete userLink[chatId];

      bot.editMessageText("✅ Download Completed", {
        chat_id: chatId,
        message_id: loading.message_id
      }).catch(() => {});

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
        caption: `🎬 ${quality} Download Complete\n\nBot ကိုအသုံးပြုသည့်အတွက် ကျေးဇူးတင်ပါသည်။`
      });

      if (fs.existsSync(video)) fs.unlinkSync(video);
    }
    // 50MB အထက်
    else {
      const fileName = path.basename(video);
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
      const link = `${baseUrl}/downloads/${fileName}`;

      await bot.sendMessage(
        chatId,
        `📦 Video Size 50MB ကျော်နေပါတယ်။\n\n⬇️ Direct Download Link\n\n${link}\n\nChrome ထဲဖွင့်လိုက်ရင် Auto Download စပါမယ်။`
      );
    }

    delete userLink[chatId];

    bot.editMessageText(
      "✅ Download Completed",
      {
        chat_id: chatId,
        message_id: loading.message_id
      }
    ).catch(() => {});

  } catch (e) {
    console.error(e);

    delete userLink[chatId];

    bot.sendMessage(
      chatId,
      "❌ Download Failed\nLink မှန်မမှန် စစ်ပြီး ထပ်ပို့ပါ။"
    );
  }
});
