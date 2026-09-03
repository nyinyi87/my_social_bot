const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const fs = require("fs");

const { downloadVideo, downloadMP3 } = require("./utils/youtube");
const { downloadFacebook } = require("./utils/facebook");
const { downloadInstagram } = require("./utils/instagram");
const { setLanguage } = require("./utils/language");

require("./utils/cleanup");

const app = express();
app.use(express.json());

const bot = new TelegramBot(process.env.BOT_TOKEN);

let userLink = {};

app.post("/webhook", (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("Bot Running");
});

app.listen(process.env.PORT || 3000);

// START
bot.onText(/\/start/, (msg) => {

  bot.sendMessage(msg.chat.id,
    "🌐 Choose Language",
    {
      reply_markup: {
        inline_keyboard: [[
          { text: "🇲🇲 မြန်မာ", callback_data: "mm" },
          { text: "🇺🇸 English", callback_data: "en" }
        ]]
      }
    });

});

// LINK DETECT
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
      "📥 Video Quality ရွေးပါ",
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

});

// CALLBACK
bot.on("callback_query", async (query) => {

  const chatId = query.message.chat.id;
  const name = query.from.first_name;

  if (query.data === "mm") {
    setLanguage(chatId, "mm");

    return bot.sendMessage(chatId,
      `မင်္ဂလာပါ ${name}

YouTube Facebook Instagram Link ပို့ပေးပါ။`);
  }

  if (query.data === "en") {
    setLanguage(chatId, "en");

    return bot.sendMessage(chatId,
      `Hello ${name}

Send YouTube Facebook Instagram Link.`);
  }

  const data = userLink[chatId];

  if (!data) return;

  try {

    if (data.type === "youtube") {

      if (query.data === "mp3") {

        const audio = await downloadMP3(data.url);

        await bot.sendAudio(chatId, audio, {
          caption: "Bot ကိုအသုံးပြုသည့်အတွက် ကျေးဇူးတင်ပါသည်။"
        });

        fs.unlinkSync(audio);

      } else {

        const video = await downloadVideo(data.url, query.data);

        const size = fs.statSync(video).size;

        if (size <= 50 * 1024 * 1024) {

          await bot.sendVideo(chatId, video, {
            caption: "Bot ကိုအသုံးပြုသည့်အတွက် ကျေးဇူးတင်ပါသည်။"
          });

        } else {

          const fileName = video.split("/").pop();

          await bot.sendMessage(chatId,
            `50MB ကျော်နေပါတယ်။

${process.env.BASE_URL}/downloads/${fileName}`);

        }

        fs.unlinkSync(video);

      }

      return;
    }

    if (data.type === "facebook") {

      const video = await downloadFacebook(data.url);

      await bot.sendVideo(chatId, video, {
        caption: "Bot ကိုအသုံးပြုသည့်အတွက် ကျေးဇူးတင်ပါသည်။"
      });

      fs.unlinkSync(video);
      return;
    }

    if (data.type === "instagram") {

      const video = await downloadInstagram(data.url);

      await bot.sendVideo(chatId, video, {
        caption: "Bot ကိုအသုံးပြုသည့်အတွက် ကျေးဇူးတင်ပါသည်။"
      });

      fs.unlinkSync(video);
      return;
    }

  } catch (err) {

    console.log(err);

    bot.sendMessage(chatId,
      "❌ Download Failed");

  }

});
