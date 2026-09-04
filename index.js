const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config();

// Downloader functions
const { downloadVideo, downloadMP3 } = require("./utils/youtube");
const { downloadFacebook } = require("./utils/facebook");
const { downloadInstagram } = require("./utils/instagram");

// Start cleanup service
require("./utils/cleanup");


// =====================================================
// EXPRESS SERVER
// =====================================================

const app = express();

const PORT = process.env.PORT || 3000;

const DOWNLOAD_DIR = path.join(__dirname, "downloads");

// Create downloads folder if not exists
if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, {
        recursive: true
    });
}


// =====================================================
// PUBLIC DOWNLOAD FOLDER
// =====================================================

app.use(
    "/downloads",
    express.static(DOWNLOAD_DIR, {
        setHeaders: (res) => {
            res.setHeader(
                "Content-Disposition",
                "attachment"
            );
        }
    })
);


// =====================================================
// HOME
// =====================================================

app.get("/", (req, res) => {
    res.status(200).send(
        "Telegram Downloader Bot Running ✅"
    );
});


// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        bot: "running",
        time: new Date().toISOString()
    });
});


// =====================================================
// START EXPRESS
// =====================================================

app.listen(PORT, "0.0.0.0", () => {
    console.log(
        `Express server running on port ${PORT}`
    );
});


// =====================================================
// TELEGRAM BOT
// =====================================================

if (!process.env.BOT_TOKEN) {

    console.error(
        "❌ BOT_TOKEN is missing from .env"
    );

    process.exit(1);
}


const bot = new TelegramBot(
    process.env.BOT_TOKEN,
    {
        polling: true
    }
);


// =====================================================
// USER DATA
// =====================================================

const userLink = {};
const language = {};
const downloading = {};


// =====================================================
// HELPER - DELETE FILE
// =====================================================

function deleteFile(filePath) {

    if (!filePath) {
        return;
    }

    try {

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

    } catch (error) {

        console.error(
            "File delete error:",
            error.message
        );

    }
}


// =====================================================
// HELPER - SAFE FILENAME
// =====================================================

function getFileName(filePath) {

    return path.basename(filePath);
}


// =====================================================
// HELPER - DOWNLOAD URL
// =====================================================

function getDownloadUrl(filePath) {

    const baseUrl =
        process.env.BASE_URL ||
        "";

    if (!baseUrl) {
        return null;
    }

    const fileName =
        encodeURIComponent(
            getFileName(filePath)
        );

    return (
        baseUrl.replace(/\/+$/, "") +
        "/downloads/" +
        fileName
    );
}


// =====================================================
// /START
// =====================================================

bot.onText(/^\/start$/, async (msg) => {

    const chatId = msg.chat.id;

    try {

        await bot.sendMessage(
            chatId,
            "🌐 Choose Language / ဘာသာစကားရွေးပါ",
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "🇲🇲 မြန်မာ",
                                callback_data: "lang_mm"
                            },
                            {
                                text: "🇺🇸 English",
                                callback_data: "lang_en"
                            }
                        ]
                    ]
                }
            }
        );

    } catch (error) {

        console.error(
            "Start error:",
            error.message
        );

    }

});


// =====================================================
// /HELP
// =====================================================

bot.onText(/^\/help$/, async (msg) => {

    const chatId = msg.chat.id;

    const text =
`📚 အသုံးပြုပုံ

1️⃣ /start ကိုနှိပ်ပါ။

2️⃣ Language ရွေးပါ။

3️⃣ YouTube / Facebook / Instagram Link ပို့ပါ။

4️⃣ YouTube ဖြစ်ပါက Quality ရွေးပါ။

5️⃣ Download ပြုလုပ်ပါ။

🎬 Video
🎵 MP3

ကိုအသုံးပြုနိုင်ပါတယ်။`;

    await bot.sendMessage(
        chatId,
        text
    );

});


// =====================================================
// /ABOUT
// =====================================================

bot.onText(/^\/about$/, async (msg) => {

    const chatId = msg.chat.id;

    const text =
`🤖 Telegram Downloader Bot

Supports:

• YouTube
• Facebook
• Instagram

Features:

🎬 Video Downloader
🎵 MP3 Downloader
📥 Direct Download Link

Bot ကိုအသုံးပြုသည့်အတွက်
ကျေးဇူးတင်ပါသည်။`;

    await bot.sendMessage(
        chatId,
        text
    );

});


// =====================================================
// MESSAGE HANDLER
// =====================================================

bot.on("message", async (msg) => {

    if (!msg.text) {
        return;
    }

    const chatId = msg.chat.id;
    const text = msg.text.trim();

    // Ignore commands
    if (text.startsWith("/")) {
        return;
    }

    // =================================================
    // URL DETECTION
    // =================================================

    let type = null;

    // YouTube
    if (
        text.includes("youtube.com/") ||
        text.includes("youtu.be/")
    ) {

        type = "youtube";

    }

    // Facebook
    else if (
        text.includes("facebook.com/") ||
        text.includes("fb.watch/")
    ) {

        type = "facebook";

    }

    // Instagram
    else if (
        text.includes("instagram.com/")
    ) {

        type = "instagram";

    }


    // =================================================
    // INVALID LINK
    // =================================================

    if (!type) {

        await bot.sendMessage(
            chatId,
`❌ Link မမှန်ပါ။

အောက်ပါ Link များကိုသာ ပို့ပါ။

▶️ YouTube
▶️ Facebook
▶️ Instagram`
        );

        return;
    }


    // =================================================
    // SAVE USER LINK
    // =================================================

    userLink[chatId] = {
        type: type,
        url: text
    };


    // =================================================
    // FACEBOOK
    // =================================================

    if (type === "facebook") {

        await bot.sendMessage(
            chatId,
            "📥 Facebook Video Download လုပ်နေပါတယ်...\n\n⏳ Please wait..."
        );

        await startDownload(
            chatId,
            "facebook"
        );

        return;
    }


    // =================================================
    // INSTAGRAM
    // =================================================

    if (type === "instagram") {

        await bot.sendMessage(
            chatId,
            "📥 Instagram Video Download လုပ်နေပါတယ်...\n\n⏳ Please wait..."
        );

        await startDownload(
            chatId,
            "instagram"
        );

        return;
    }


    // =================================================
    // YOUTUBE QUALITY
    // =================================================

    if (type === "youtube") {

        await bot.sendMessage(
            chatId,
            "📥 Quality ရွေးပါ",
            {
                reply_markup: {
                    inline_keyboard: [

                        [
                            {
                                text: "144p",
                                callback_data: "quality_144"
                            },
                            {
                                text: "240p",
                                callback_data: "quality_240"
                            }
                        ],

                        [
                            {
                                text: "360p",
                                callback_data: "quality_360"
                            },
                            {
                                text: "480p",
                                callback_data: "quality_480"
                            }
                        ],

                        [
                            {
                                text: "720p",
                                callback_data: "quality_720"
                            },
                            {
                                text: "1080p",
                                callback_data: "quality_1080"
                            }
                        ],

                        [
                            {
                                text: "🎵 MP3",
                                callback_data: "quality_mp3"
                            }
                        ]

                    ]
                }
            }
        );

    }

});


// =====================================================
// CALLBACK QUERY
// =====================================================

bot.on(
    "callback_query",
    async (query) => {

        const chatId =
            query.message.chat.id;

        const name =
            query.from.first_name ||
            "User";

        const data =
            query.data;


        // =================================================
        // ANSWER CALLBACK
        // =================================================

        try {

            await bot.answerCallbackQuery(
                query.id
            );

        } catch (error) {

            console.error(
                "Callback answer error:",
                error.message
            );

        }


        // =================================================
        // MYANMAR LANGUAGE
        // =================================================

        if (data === "lang_mm") {

            language[chatId] = "mm";

            await bot.sendMessage(
                chatId,
`မင်္ဂလာပါ ${name} 👋

YouTube, Facebook နှင့် Instagram
Video Link ပို့ပေးပါ။`
            );

            return;
        }


        // =================================================
        // ENGLISH LANGUAGE
        // =================================================

        if (data === "lang_en") {

            language[chatId] = "en";

            await bot.sendMessage(
                chatId,
`Hello ${name} 👋

Send your YouTube, Facebook
or Instagram video link.`
            );

            return;
        }


        // =================================================
        // QUALITY
        // =================================================

        if (
            data.startsWith(
                "quality_"
            )
        ) {

            const quality =
                data.replace(
                    "quality_",
                    ""
                );

            const saved =
                userLink[chatId];


            if (!saved) {

                await bot.sendMessage(
                    chatId,
                    "❌ Link မတွေ့ပါ။ Link ပြန်ပို့ပါ။"
                );

                return;
            }


            // =================================================
            // ONLY YOUTUBE QUALITY
            // =================================================

            if (
                saved.type !== "youtube"
            ) {

                await bot.sendMessage(
                    chatId,
                    "❌ ဒီ Link အတွက် Quality မရွေးနိုင်ပါ။"
                );

                return;
            }


            // =================================================
            // START DOWNLOAD
            // =================================================

            await startDownload(
                chatId,
                "youtube",
                quality
            );

        }

    }
);


// =====================================================
// DOWNLOAD FUNCTION
// =====================================================

async function startDownload(
    chatId,
    type,
    quality = "720"
) {

    // =================================================
    // PREVENT DUPLICATE DOWNLOAD
    // =================================================

    if (downloading[chatId]) {

        await bot.sendMessage(
            chatId,
            "⏳ သင့်ရဲ့ Download တစ်ခု လုပ်နေပြီးသားပါ။\nပြီးအောင်စောင့်ပေးပါ။"
        );

        return;
    }


    const saved =
        userLink[chatId];


    if (!saved) {

        await bot.sendMessage(
            chatId,
            "❌ Download Link မတွေ့ပါ။"
        );

        return;
    }


    downloading[chatId] = true;


    let loadingMessage = null;
    let filePath = null;


    try {

        // =================================================
        // LOADING
        // =================================================

        loadingMessage =
            await bot.sendMessage(
                chatId,
                "⏳ Downloading...\n\nPlease wait..."
            );


        // =================================================
        // FACEBOOK
        // =================================================

        if (type === "facebook") {

            filePath =
                await downloadFacebook(
                    saved.url
                );


            if (!filePath) {

                throw new Error(
                    "Facebook download returned empty file"
                );

            }


            await sendVideoOrLink(
                chatId,
                filePath,
                "📘 Facebook Download Complete"
            );

        }


        // =================================================
        // INSTAGRAM
        // =================================================

        else if (type === "instagram") {

            filePath =
                await downloadInstagram(
                    saved.url
                );


            if (!filePath) {

                throw new Error(
                    "Instagram download returned empty file"
                );

            }


            await sendVideoOrLink(
                chatId,
                filePath,
                "📸 Instagram Download Complete"
            );

        }


        // =================================================
        // YOUTUBE MP3
        // =================================================

        else if (
            type === "youtube" &&
            quality === "mp3"
        ) {

            filePath =
                await downloadMP3(
                    saved.url
                );


            if (!filePath) {

                throw new Error(
                    "MP3 download returned empty file"
                );

            }


            const size =
                fs.statSync(
                    filePath
                ).size;


            // Telegram Audio 50MB
            if (
                size <=
                50 * 1024 * 1024
            ) {

                await bot.sendAudio(
                    chatId,
                    filePath,
                    {
                        caption:
`🎵 MP3 Download Complete

🙏 ကျေးဇူးတင်ပါသည်။`
                    }
                );

            } else {

                const link =
                    getDownloadUrl(
                        filePath
                    );


                if (!link) {

                    throw new Error(
                        "BASE_URL is missing"
                    );

                }


                await bot.sendMessage(
                    chatId,
`🎵 MP3 Size 50MB ကျော်နေပါတယ်။

⬇️ Direct Download

${link}`
                );

            }

        }


        // =================================================
        // YOUTUBE VIDEO
        // =================================================

        else if (
            type === "youtube"
        ) {

            filePath =
                await downloadVideo(
                    saved.url,
                    quality
                );


            if (!filePath) {

                throw new Error(
                    "YouTube download returned empty file"
                );

            }


            await sendVideoOrLink(
                chatId,
                filePath,
                `🎬 YouTube ${quality}p Download Complete`
            );

        }


        // =================================================
        // FINISHED
        // =================================================

        if (loadingMessage) {

            try {

                await bot.editMessageText(
                    "✅ Download Completed",
                    {
                        chat_id: chatId,
                        message_id:
                            loadingMessage.message_id
                    }
                );

            } catch (error) {

                // Ignore edit error
                console.log(
                    "Loading edit skipped"
                );

            }

        }

    } catch (error) {

        console.error(
            "Download error:",
            error
        );


        await bot.sendMessage(
            chatId,
`❌ Download Failed

Link မှန်မမှန် စစ်ပြီး
ထပ်ကြိုးစားပါ။

အချို့သော Private / Login လိုအပ်သော
Video များကို Download မလုပ်နိုင်ပါ။`
        );

    } finally {

        // =================================================
        // DELETE TEMP FILE
        // =================================================

        // IMPORTANT:
        // If file is larger than 50MB,
        // direct link is needed.
        //
        // Therefore don't immediately delete it.
        // cleanup.js will remove old files.

        if (filePath) {

            try {

                const size =
                    fs.existsSync(filePath)
                        ? fs.statSync(filePath).size
                        : 0;


                if (
                    size <=
                    50 * 1024 * 1024
                ) {

                    deleteFile(
                        filePath
                    );

                }

            } catch (error) {

                console.error(
                    "Final cleanup error:",
                    error.message
                );

            }

        }


        downloading[chatId] = false;

    }

}


// =====================================================
// SEND VIDEO OR DIRECT LINK
// =====================================================

async function sendVideoOrLink(
    chatId,
    filePath,
    caption
) {

    if (
        !fs.existsSync(filePath)
    ) {

        throw new Error(
            "Downloaded file does not exist"
        );

    }


    const size =
        fs.statSync(
            filePath
        ).size;


    // =================================================
    // UNDER 50MB
    // =================================================

    if (
        size <=
        50 * 1024 * 1024
    ) {

        await bot.sendVideo(
            chatId,
            filePath,
            {
                caption:
                    `${caption}\n\n🙏 ကျေးဇူးတင်ပါသည်။`,
                supports_streaming: true
            }
        );

        return;
    }


    // =================================================
    // OVER 50MB
    // =================================================

    const link =
        getDownloadUrl(
            filePath
        );


    if (!link) {

        throw new Error(
            "BASE_URL is missing"
        );

    }


    const sizeMB =
        (
            size /
            1024 /
            1024
        ).toFixed(2);


    await bot.sendMessage(
        chatId,
`📦 Video Size: ${sizeMB} MB

Telegram မှာ တိုက်ရိုက်ပို့လို့မရတဲ့
အရွယ်အစားဖြစ်နေပါတယ်။

⬇️ Direct Download Link

${link}

Chrome မှာဖွင့်ပြီး Download လုပ်နိုင်ပါတယ်။`
    );

}


// =====================================================
// BOT ERROR EVENTS
// =====================================================

bot.on(
    "polling_error",
    (error) => {

        console.error(
            "Telegram polling error:",
            error.message
        );

    }
);


// =====================================================
// PROCESS ERROR
// =====================================================

process.on(
    "unhandledRejection",
    (error) => {

        console.error(
            "Unhandled rejection:",
            error
        );

    }
);


process.on(
    "uncaughtException",
    (error) => {

        console.error(
            "Uncaught exception:",
            error
        );

    }
);


console.log(
    "🤖 Telegram Downloader Bot Started"
);
