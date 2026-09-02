require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const path = require("path");
const fs = require("fs");

const app = require("./server");
require("./utils/cleanup");

const { setLanguage, text } = require("./utils/language");
const { downloadVideo, downloadMP3, getThumbnail } = require("./utils/youtube");
const { downloadFacebook } = require("./utils/facebook");
const { downloadInstagram } = require("./utils/instagram");

const token = process.env.BOT_TOKEN || "8874977378:AAG3wcNSI3myiaifFOMNyfBirMZyGrcgSeE";
const bot = new TelegramBot(token, { polling: true });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

bot.setMyCommands([
  { command: "start", description: "Start the bot / ဘော့တ်ကို စတင်ရန်" },
  { command: "help", description: "How to use / အသုံးပြုပုံ ကြည့်ရန်" },
  { command: "about", description: "About this bot / ဘော့တ်အကြောင်း ကြည့်ရန်" }
]);

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "🌐 Choose Language / ဘာသာစကားရွေးပါ:", {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🇲🇲 မြန်မာ", callback_data: "mm" },
          { text: "🇺🇸 English", callback_data: "en" }
        ]
      ]
    }
  });
});

bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    text(
      chatId,
`📚 အသုံးပြုပုံ

1. /start နှိပ်ပါ။
2. ဘာသာစကားရွေးပါ။
3. Link ပို့ပါ။
4. Quality ရွေးပါ။
5. Video သို့ MP3 Download လုပ်ပါ။`,
`📚 How to use

1. Type /start
2. Choose language.
3. Send link.
4. Choose quality.
5. Download Video or MP3.`
    )
  );
});

bot.onText(/\/about/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    text(
      chatId,
`🤖 Telegram Downloader Bot

YouTube
Facebook
Instagram

Video, Photo နှင့် MP3 Download ပြုလုပ်နိုင်သည်။

Bot ကိုအသုံးပြုသည့်အတွက် ကျေးဇူးတင်ပါသည်။`,
`🤖 Telegram Downloader Bot

Supports YouTube, Facebook and Instagram.

Video, Photo and MP3 Downloader.

Thank you for using this bot.`
    )
  );
});

bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const name = query.from.first_name || "User";

  if (query.data === "mm") {
    setLanguage(chatId, "mm");
    return bot.sendMessage(
      chatId,
      `မင်္ဂလာပါ ${name}\n\nYouTube, Facebook နှင့် Instagram Link ပို့ပေးပါ။`
    );
  }

  if (query.data === "en") {
    setLanguage(chatId, "en");
    return bot.sendMessage(
      chatId,
      `Hello ${name}\n\nSend YouTube, Facebook or Instagram Link.`
    );
  }
});

async function sendMediaFile(chatId, filePath) {
  const captionMM = `📥 Download ပြီးပါပြီ။\n\nBot ကိုအသုံးပြုသည့်အတွက် ကျေးဇူးတင်ပါသည်။`;
  const captionEN = `📥 Download Completed.\n\nThank you for using this bot.`;
  const caption = text(chatId, captionMM, captionEN);

  const size = fs.statSync(filePath).size;
  const fileName = path.basename(filePath);

  if (size < 50 * 1024 * 1024) {
    await bot.sendVideo(chatId, filePath, { caption });
  } else {
    const link = `${process.env.BASE_URL || "http://localhost:3000"}/downloads/${fileName}`;
    await bot.sendMessage(
      chatId,
      `📦 Video Size 50MB ကျော်နေပါတယ်။\n\n⬇️ Direct Download Link\n\n${link}`
    );
  }
}
// Link များ (YouTube, Facebook, Instagram) လက်ခံပြီး Download ဆွဲပေးမည့် Logic
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const textMsg = msg.text;

  // Command များကို ကျော်ရန်
  if (!textMsg || textMsg.startsWith("/")) return;

  // URL ဟုတ်မဟုတ် စစ်ဆေးခြင်း
  if (textMsg.includes("youtube.com") || textMsg.includes("youtu.be")) {
    const progress = await bot.sendMessage(
      chatId,
      text(chatId, "⏳ YouTube Video ဒေါင်းလုဒ်ဆွဲနေပါတယ်...", "⏳ Downloading YouTube Video...")
    );

    try {
      const filePath = await downloadVideo(textMsg);
      await sendMediaFile(chatId, filePath);
      await bot.deleteMessage(chatId, progress.message_id);
    } catch (error) {
      console.error(error);
      await bot.sendMessage(
        chatId,
        text(chatId, "❌ ဒေါင်းလုဒ်ဆွဲရာတွင် အမှားအယွင်း ရှိနေပါသည်။", "❌ Download failed.")
      );
    }
  } else if (textMsg.includes("facebook.com") || textMsg.includes("fb.watch")) {
    const progress = await bot.sendMessage(
      chatId,
      text(chatId, "⏳ Facebook Video ဒေါင်းလုဒ်ဆွဲနေပါတယ်...", "⏳ Downloading Facebook Video...")
    );

    try {
      const filePath = await downloadFacebook(textMsg);
      await sendMediaFile(chatId, filePath);
      await bot.deleteMessage(chatId, progress.message_id);
    } catch (error) {
      console.error(error);
      await bot.sendMessage(
        chatId,
        text(chatId, "❌ ဒေါင်းလုဒ်ဆွဲရာတွင် အမှားအယွင်း ရှိနေပါသည်။", "❌ Download failed.")
      );
    }
  } else if (textMsg.includes("instagram.com")) {
    const progress = await bot.sendMessage(
      chatId,
      text(chatId, "⏳ Instagram Media ဒေါင်းလုဒ်ဆွဲနေပါတယ်...", "⏳ Downloading Instagram Media...")
    );

    try {
      const filePath = await downloadInstagram(textMsg);
      await sendMediaFile(chatId, filePath);
      await bot.deleteMessage(chatId, progress.message_id);
    } catch (error) {
      console.error(error);
      await bot.sendMessage(
        chatId,
        text(chatId, "❌ ဒေါင်းလုဒ်ဆွဲရာတွင် အမှားအယွင်း ရှိနေပါသည်။", "❌ Download failed.")
      );
    }
  }
});

