import os
import asyncio
import threading
from flask import Flask, send_from_directory
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, filters, ContextTypes
import yt_dlp

# --- Config ---
TOKEN = os.environ.get("8874977378:AAG3wcNSI3myiaifFOMNyfBirMZyGrcgSeE")  # Server Environment Variable မှ ယူမည်
PORT = int(os.environ.get("PORT", 5000))
SERVER_URL = os.environ.get("SERVER_URL", "")  # Server ၏ Domain Name

DOWNLOAD_DIR = "downloads"
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

# Web Server for Direct Download Links (>50MB)
app = Flask(__name__)

@app.route('/')
def home():
    return "Bot is running live!"

@app.route('/files/<path:filename>')
def download_file(filename):
    return send_from_directory(DOWNLOAD_DIR, filename, as_attachment=True)

def run_flask():
    app.run(host='0.0.0.0', port=PORT)

# --- Telegram Bot Logic ---
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [
        [InlineKeyboardButton("English 🇬🇧", callback_data='lang_en'),
         InlineKeyboardButton("မြန်မာ 🇲🇲", callback_data='lang_mm')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text("Please select your language / ကျေးဇူးပြု၍ ဘာသာစကား ရွေးချယ်ပါ:", reply_markup=reply_markup)

async def button_click(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    if query.data.startswith('lang_'):
        lang = query.data.split('_')[1]
        context.user_data['lang'] = lang
        msg = "Language set to English. Send me a video/photo link!" if lang == 'en' else "ဘာသာစကား မြန်မာ ကိုရွေးချယ်ပြီးပါပြီ။ Video/Photo Link ပို့ပေးပါ။"
        await query.edit_message_text(text=msg)
        
    elif query.data.startswith('dl_'):
        _, format_type, quality, _ = query.data.split('_')
        url = context.user_data.get('url')
        
        await query.edit_message_text("Downloading... ကျေးဇူးပြု၍ ခဏစောင့်ပါ။")
        asyncio.create_task(process_download(query, context, url, format_type, quality))

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    url = update.message.text.strip()
    if not (url.startswith("http://") or url.startswith("https://")):
        await update.message.reply_text("Invalid Link! / မှားယွင်းသော Link ဖြစ်ပါသည်။")
        return

    context.user_data['url'] = url
    
    # 360p ပါဝင်အောင် ပြင်ဆင်ထားသော Keyboard
    keyboard = [
        [InlineKeyboardButton("Video (1080p)", callback_data='dl_video_1080_0'),
         InlineKeyboardButton("Video (720p)", callback_data='dl_video_720_0')],
        [InlineKeyboardButton("Video (480p)", callback_data='dl_video_480_0'),
         InlineKeyboardButton("Video (360p)", callback_data='dl_video_360_0')],
        [InlineKeyboardButton("Video (144p)", callback_data='dl_video_144_0'),
         InlineKeyboardButton("MP3 Audio", callback_data='dl_audio_best_0')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text("Choose Format/Quality / အရည်အသွေး ရွေးချယ်ပါ:", reply_markup=reply_markup)

async def process_download(query, context, url, format_type, quality):
    chat_id = query.message.chat_id
    caption_text = "Bot ကိုအသုံးပြုသည့်အတွက် ကျေးဇူးတင်ပါသည်။"
    
    ydl_opts = {
        'outtmpl': f'{DOWNLOAD_DIR}/%(id)s.%(ext)s',
        'quiet': True,
    }
    
    if format_type == 'audio':
        ydl_opts['format'] = 'bestaudio/best'
        ydl_opts['postprocessors'] = [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }]
    else:
        ydl_opts['format'] = f'bestvideo[height<={quality}]+bestaudio/best[height<={quality}]/best'

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            file_path = ydl.prepare_filename(info)
            if format_type == 'audio':
                file_path = os.path.splitext(file_path)[0] + ".mp3"

        file_size_mb = os.path.getsize(file_path) / (1024 * 1024)

        # 50MB အထက်ဖြစ်ပါက Direct Link ပို့ပေးခြင်း
        if file_size_mb > 50:
            filename = os.path.basename(file_path)
            direct_link = f"{SERVER_URL}/files/{filename}"
            await context.bot.send_message(
                chat_id=chat_id,
                text=f"ဖိုင်ဆိုဒ် 50MB ထက်ကြီးသောကြောင့် အောက်ပါ Direct Link တွင် ဒေါင်းလုဒ်ဆွဲပါ:\n\n{direct_link}\n\n{caption_text}"
            )
            sent_msg = None
        else:
            # 50MB အောက်ကို Telegram ထဲ တိုက်ရိုက်ပို့ခြင်း
            with open(file_path, 'rb') as file:
                if format_type == 'audio':
                    sent_msg = await context.bot.send_audio(chat_id=chat_id, audio=file, caption=caption_text)
                else:
                    sent_msg = await context.bot.send_video(chat_id=chat_id, video=file, caption=caption_text)

        # 1 နာရီ (၃၆၀၀ စက္ကန့်) ကြာလျှင် ဖိုင်နှင့် မက်ဆေ့ခ်ျကို Auto Clear လုပ်ပေးခြင်း
        msg_id = sent_msg.message_id if sent_msg else None
        context.job_queue.run_once(
            auto_delete, 
            3600, 
            data={'file_path': file_path, 'chat_id': chat_id, 'message_id': msg_id}
        )

    except Exception as e:
        await context.bot.send_message(chat_id=chat_id, text=f"Error: {str(e)}")

async def auto_delete(context: ContextTypes.DEFAULT_TYPE):
    job = context.job
    file_path = job.data['file_path']
    chat_id = job.data['chat_id']
    message_id = job.data['message_id']

    # Server ထဲမှ ဖိုင်ကို ဖျက်ခြင်း
    if os.path.exists(file_path):
        os.remove(file_path)

    # Telegram မက်ဆေ့ခ်ျကို ဖျက်ခြင်း
    if message_id:
        try:
            await context.bot.delete_message(chat_id=chat_id, message_id=message_id)
        except Exception:
            pass

def main():
    threading.Thread(target=run_flask, daemon=True).start()

    application = Application.builder().token(TOKEN).build()
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CallbackQueryHandler(button_click))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    
    application.run_polling()

if __name__ == '__main__':
    main()
