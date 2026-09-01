import os
import glob
import asyncio
import threading
from flask import Flask
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application,
    CommandHandler,
    CallbackQueryHandler,
    MessageHandler,
    filters,
    ContextTypes,
)
import yt_dlp

# Flask app for Back4App health check
app = Flask(__name__)

@app.route('/')
def home():
    return "Bot is running!"

def run_flask():
    app.run(host='0.0.0.0', port=8080)

# Bot Token ကို BotFather မှရယူ၍ ဒီနေရာတွင် ထည့်ပါ
TOKEN = '8874977378:AAG3wcNSI3myiaifFOMNyfBirMZyGrcgSeE'

# ၁။ English / Myanmar ဘာသာစကား ရွေးချယ်ခိုင်းခြင်း
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [
        [
            InlineKeyboardButton("English 🇬🇧", callback_data='lang_en'),
            InlineKeyboardButton("မြန်မာစာ 🇲🇲", callback_data='lang_my'),
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text("Please select your language / ကျေးဇူးပြု၍ ဘာသာစကားရွေးချယ်ပါ:", reply_markup=reply_markup)

# ၂။ ဘာသာစကားရွေးချယ်ပြီးနောက် နှုတ်ဆက်စာ ပို့ခြင်း
async def language_button(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    first_name = query.from_user.first_name
    lang = query.data

    if lang == 'lang_en':
        text = f"Hello {first_name}!\nPlease send me YouTube, Facebook, or Instagram video/photo links."
    else:
        text = f"မင်္ဂလာပါ {first_name}!\nYouTube, Facebook, Instagram video/photo link များကို ပို့ပေးပါ။"

    await query.edit_message_text(text=text)

# ဒေါင်းလုဒ်ဆွဲထားသော File ကို ၁ နာရီအကြာတွင် Auto Clear (ဖျက်) လုပ်ပေးသည့် function
def delete_file_later(file_path):
    async def task():
        await asyncio.sleep(3600)  # ၁ နာရီ (၃၆၀၀ စက္ကန့်)
        if os.path.exists(file_path):
            os.remove(file_path)
    asyncio.create_task(task())

# Telegram မှ ပို့လိုက်သော File / Message ကို Telegram Server တွင် ၁ နာရီအကြာ Auto Clear လုပ်ခြင်း
async def delete_msg_later(context: ContextTypes.DEFAULT_TYPE, chat_id: int, message_id: int):
    await asyncio.sleep(3600)
    try:
        await context.bot.delete_message(chat_id=chat_id, message_id=message_id)
    except Exception:
        pass

# ၃၊ ၄၊ ၅၊ ၆၊ ၇။ Link များကို လက်ခံပြီး Download ယူခြင်း
async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    url = update.message.text.strip()
    chat_id = update.effective_chat.id

    if not (url.startswith("http://") or url.startswith("https://")):
        await update.message.reply_text("ကျေးဇူးပြု၍ မှန်ကန်သော Link ကို ပို့ပေးပါ။ / Please send a valid link.")
        return

    status_msg = await update.message.reply_text("Processing... ခဏစောင့်ပေးပါ။")

    # yt-dlp အပြင်အဆင် (Quality: 144p - 1080p အထိ ရွေးချယ်ခြင်း)
    ydl_opts = {
        'format': 'bestvideo[height<=1080]+bestaudio/best[height<=1080]/best',
        'outtmpl': f'downloads/{chat_id}_%(title)s.%(ext)s',
        'quiet': True,
        'no_warnings': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)

        # Download ဆွဲထားသော ဖိုင်ကို ရှာဖွေခြင်း
        downloaded_files = glob.glob(f'downloads/{chat_id}_*')
        if not downloaded_files:
            await status_msg.edit_text("Download ရယူရာတွင် အဆင်မပြေပါ။")
            return

        file_path = downloaded_files[0]
        file_size_mb = os.path.getsize(file_path) / (1024 * 1024)

        # ၇။ Caption စာသား
        caption_text = "Bot ကိုအသုံးပြုသည့်အတွက် ကျေးဇူးတင်ပါသည်။"

        # ၅။ 50MB ထက်ကြီးပါက Direct Link ပို့ပေးခြင်း
        if file_size_mb > 50:
            # Direct link ကို ပို့ပေးခြင်း (Chrome မှတဆင့် ဒေါင်းရန်)
            direct_link = info.get('url', url)
            sent_msg = await update.message.reply_text(
                f"ဖိုင်ဆိုဒ် 50MB ထက်ကြီးနေပါသဖြင့် Direct Link မှတဆင့် ဒေါင်းလုဒ်ရယူပါ:\n\n[Click to Download]({direct_link})\n\n{caption_text}",
                parse_mode='Markdown'
            )
            # local ဖိုင်ကို ရှင်းထုတ်ခြင်း
            if os.path.exists(file_path):
                os.remove(file_path)
        else:
            # ၄။ Video သို့မဟုတ် Photo/Mp3 ကို Telegram ထဲ တိုက်ရိုက်ပြန်ပို့ပေးခြင်း
            await status_msg.edit_text("Telegram သို့ ဖိုင်တင်ပို့နေပါသည်။...")
            with open(file_path, 'rb') as f:
                if file_path.endswith(('.jpg', '.png', '.jpeg')):
                    sent_msg = await context.bot.send_photo(chat_id=chat_id, photo=f, caption=caption_text)
                else:
                    sent_msg = await context.bot.send_video(chat_id=chat_id, video=f, caption=caption_text)

            # Local မှ ဖိုင်ကို ၁ နာရီအကြာတွင် ဖျက်ရန်
            delete_file_later(file_path)

        await status_msg.delete()

        # ၆။ Telegram တွင် ပို့လိုက်သော message/video ကို ၁ နာရီအကြာတွင် Auto clear (ဖျက်) ပေးခြင်း
        asyncio.create_task(delete_msg_later(context, chat_id, sent_msg.message_id))

    except Exception as e:
        await status_msg.edit_text(f"ဒေါင်းလုဒ်ပြုလုပ်စဉ် အမှားအယွင်းရှိပါသည်: {str(e)}")

def main():
    # Folder မရှိပါက အသစ်ဆောက်ရန်
    if not os.path.exists('downloads'):
        os.makedirs('downloads')

    # Flask ကို Thread ဖြင့် သီးသန့် Run ခြင်း
    threading.Thread(target=run_flask, daemon=True).start()

    # Telegram Bot စတင်ခြင်း
    application = Application.builder().token(TOKEN).build()

    application.add_handler(CommandHandler("start", start))
    application.add_handler(CallbackQueryHandler(language_button))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    application.run_polling()

if __name__ == '__main__':
    main()
