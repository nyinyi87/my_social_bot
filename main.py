import os
import glob
import asyncio
import threading
from flask import Flask, send_from_directory
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

app = Flask(__name__)
SERVER_URL = os.getenv("SERVER_URL", "https://mytelegrambot-fx4m1m4f.b4a.run/")

@app.route('/')
def home():
    return "Bot is running perfectly!"

@app.route('/download/<path:filename>')
def download_file(filename):
    file_path = os.path.join('downloads', filename)
    if os.path.exists(file_path):
        return send_from_directory('downloads', filename, as_attachment=True)
    else:
        return "File expired or not found / ဖိုင်သက်တမ်းကုန်သွားပါပြီ။", 404

def run_flask():
    app.run(host='0.0.0.0', port=8080)

TOKEN = os.getenv("BOT_TOKEN", "8874977378:AAG3wcNSI3myiaifFOMNyfBirMZyGrcgSeE")

# နောက်ကွယ်မှ ဖိုင်ဖျက်မည့် Async Task
async def delete_file_later(file_path: str, delay: int = 3600):
    await asyncio.sleep(delay)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass

# စာတိုဖျက်မည့် Async Task
async def delete_msg_later(context: ContextTypes.DEFAULT_TYPE, chat_id: int, message_id: int, delay: int = 3600):
    await asyncio.sleep(delay)
    try:
        await context.bot.delete_message(chat_id=chat_id, message_id=message_id)
    except Exception:
        pass

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [
        [
            InlineKeyboardButton("English 🇬🇧", callback_data='lang_en'),
            InlineKeyboardButton("မြန်မာစာ 🇲🇲", callback_data='lang_my'),
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text(
        "Please select your language / ကျေးဇူးပြု၍ ဘာသာစကားရွေးချယ်ပါ:",
        reply_markup=reply_markup
    )

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

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    url = update.message.text.strip()
    
    if not (url.startswith("http://") or url.startswith("https://")):
        await update.message.reply_text("ကျေးဇူးပြု၍ မှန်ကန်သော Link ကို ပို့ပေးပါ။ / Please send a valid link.")
        return

    context.user_data['download_url'] = url

    keyboard = [
        [
            InlineKeyboardButton("🎬 1080p Full HD", callback_data='quality_1080'),
            InlineKeyboardButton("🎬 720p HD", callback_data='quality_720'),
        ],
        [
            InlineKeyboardButton("🎬 480p", callback_data='quality_480'),
            InlineKeyboardButton("🎬 360p", callback_data='quality_360'),
        ],
        [
            InlineKeyboardButton("🎬 240p", callback_data='quality_240'),
            InlineKeyboardButton("🎬 144p", callback_data='quality_144'),
        ],
        [
            InlineKeyboardButton("🎵 MP3 Audio Only", callback_data='quality_mp3'),
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text(
        "ကျေးဇူးပြု၍ ဒေါင်းလုဒ်ဆွဲလိုသော Quality သို့မဟုတ် Format ကို ရွေးချယ်ပါ:",
        reply_markup=reply_markup
    )

# Sync yt-dlp function ကို thread ဖြင့် သီးသန့် run ရန် ပြင်ဆင်ခြင်း
def download_with_ytdlp(ydl_opts, url):
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        return ydl.extract_info(url, download=True)

async def process_download(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    choice = query.data
    url = context.user_data.get('download_url')
    chat_id = update.effective_chat.id

    if not url:
        await query.edit_message_text("Link သက်တမ်းကုန်သွားပါပြီ။ Link ကို ပြန်လည်ပို့ပေးပါ။")
        return

    await query.edit_message_text("🔄 ဒေါင်းလုဒ်ဆွဲနေပါသည်။ ခဏစောင့်ပေးပါ...")

    out_prefix = f"{chat_id}_{query.id}"
    outtmpl = f"downloads/{out_prefix}_%(title)s.%(ext)s"

    common_opts = {
        'outtmpl': outtmpl,
        'cookiefile': 'cookies.txt' if os.path.exists('cookies.txt') else None,
        'quiet': True,
        'no_warnings': True,
        'extractor_args': {
            'youtube': {
                'player_client': ['ios', 'android', 'web']
            }
        }
    }

    if choice == 'quality_mp3':
        ydl_opts = {
            **common_opts,
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
        }
    else:
        res = choice.split('_')[1]
        ydl_opts = {
            **common_opts,
            'format': f'bestvideo[height<={res}]+bestaudio/best[height<={res}]/best',
        }

    try:
        # Blocking function ကို thread ဖြင့် run စေခြင်း
        await asyncio.to_thread(download_with_ytdlp, ydl_opts, url)

        matched_files = glob.glob(f"downloads/{out_prefix}_*")
        if not matched_files:
            await query.edit_message_text("❌ ဒေါင်းလုဒ်ရယူရာတွင် အဆင်မပြေပါ။")
            return

        file_path = matched_files[0]
        filename = os.path.basename(file_path)
        file_size_mb = os.path.getsize(file_path) / (1024 * 1024)

        caption_text = "Bot ကိုအသုံးပြုသည့်အတွက် ကျေးဇူးတင်ပါသည်။"

        if file_size_mb > 50:
            direct_download_url = f"{SERVER_URL}/download/{filename}"
            
            message_text = (
                f"⚠️ **ဖိုင်ဆိုဒ် ({file_size_mb:.1f} MB) ရှိသဖြင့် Telegram Limit ထက်ကျော်လွန်နေပါသည်။**\n\n"
                f"📥 အောက်ပါ Button ကိုနှိပ်ပါက Direct Auto Download ရယူပါလိမ့်မည်:\n\n"
                f"{caption_text}"
            )
            
            keyboard = [[InlineKeyboardButton("⬇️ Direct Download", url=direct_download_url)]]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            sent_msg = await context.bot.send_message(
                chat_id=chat_id,
                text=message_text,
                reply_markup=reply_markup,
                parse_mode='Markdown'
            )
            
            asyncio.create_task(delete_file_later(file_path, delay=3600))
        else:
            await query.edit_message_text("📤 Telegram သို့ တင်ပို့နေပါသည်။...")
            
            with open(file_path, 'rb') as f:
                if choice == 'quality_mp3' or file_path.endswith('.mp3'):
                    sent_msg = await context.bot.send_audio(chat_id=chat_id, audio=f, caption=caption_text)
                elif file_path.endswith(('.jpg', '.jpeg', '.png', '.webp')):
                    sent_msg = await context.bot.send_photo(chat_id=chat_id, photo=f, caption=caption_text)
                else:
                    sent_msg = await context.bot.send_video(chat_id=chat_id, video=f, caption=caption_text)

            asyncio.create_task(delete_file_later(file_path, delay=10))

        asyncio.create_task(delete_msg_later(context, chat_id, sent_msg.message_id, delay=3600))
        await query.message.delete()

    except Exception as e:
        await query.edit_message_text(f"❌ အမှားအယွင်း ဖြစ်ပေါ်ခဲ့သည်: {str(e)}")

def main():
    if not os.path.exists('downloads'):
        os.makedirs('downloads')

    threading.Thread(target=run_flask, daemon=True).start()

    application = Application.builder().token(TOKEN).build()

    application.add_handler(CommandHandler("start", start))
    application.add_handler(CallbackQueryHandler(language_button, pattern='^lang_'))
    application.add_handler(CallbackQueryHandler(process_download, pattern='^quality_'))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    application.run_polling()

if __name__ == '__main__':
    main()
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text(
        "ကျေးဇူးပြု၍ ဒေါင်းလုဒ်ဆွဲလိုသော Quality သို့မဟုတ် Format ကို ရွေးချယ်ပါ:",
        reply_markup=reply_markup
    )

async def process_download(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    choice = query.data
    url = context.user_data.get('download_url')
    chat_id = update.effective_chat.id

    if not url:
        await query.edit_message_text("Link သက်တမ်းကုန်သွားပါပြီ။ Link ကို ပြန်လည်ပို့ပေးပါ။")
        return

    await query.edit_message_text("🔄 ဒေါင်းလုဒ်ဆွဲနေပါသည်။ ခဏစောင့်ပေးပါ...")

    out_prefix = f"{chat_id}_{query.id}"
    outtmpl = f"downloads/{out_prefix}_%(title)s.%(ext)s"

    # YouTube Bot Blocking ကို ကျော်လွှားရန် player_client ပြင်ဆင်ခြင်း
    common_opts = {
        'outtmpl': outtmpl,
        'cookiefile': 'cookies.txt' if os.path.exists('cookies.txt') else None,
        'quiet': True,
        'no_warnings': True,
        'extractor_args': {
            'youtube': {
                'player_client': ['ios', 'android', 'web']
            }
        }
    }

    if choice == 'quality_mp3':
        ydl_opts = {
            **common_opts,
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
        }
    else:
        res = choice.split('_')[1]
        ydl_opts = {
            **common_opts,
            'format': f'bestvideo[height<={res}]+bestaudio/best[height<={res}]/best',
        }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)

        matched_files = glob.glob(f"downloads/{out_prefix}_*")
        if not matched_files:
            await query.edit_message_text("❌ ဒေါင်းလုဒ်ရယူရာတွင် အဆင်မပြေပါ။")
            return

        file_path = matched_files[0]
        filename = os.path.basename(file_path)
        file_size_mb = os.path.getsize(file_path) / (1024 * 1024)

        caption_text = "Bot ကိုအသုံးပြုသည့်အတွက် ကျေးဇူးတင်ပါသည်။"

        if file_size_mb > 50:
            direct_download_url = f"{SERVER_URL}/download/{filename}"
            
            message_text = (
                f"⚠️ **ဖိုင်ဆိုဒ် ({file_size_mb:.1f} MB) ရှိသဖြင့် Telegram Limit ထက်ကျော်လွန်နေပါသည်။**\n\n"
                f"📥 အောက်ပါ Button ကိုနှိပ်ပါက Chrome တွင် Direct Auto Download ရယူပါလိမ့်မည်:\n\n"
                f"{caption_text}"
            )
            
            keyboard = [[InlineKeyboardButton("⬇️ Direct Download (Chrome)", url=direct_download_url)]]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            sent_msg = await context.bot.send_message(
                chat_id=chat_id,
                text=message_text,
                reply_markup=reply_markup,
                parse_mode='Markdown'
            )
            
            delete_file_later(file_path, delay=3600)
        else:
            await query.edit_message_text("📤 Telegram သို့ တင်ပို့နေပါသည်။...")
            
            with open(file_path, 'rb') as f:
                if choice == 'quality_mp3' or file_path.endswith('.mp3'):
                    sent_msg = await context.bot.send_audio(chat_id=chat_id, audio=f, caption=caption_text)
                elif file_path.endswith(('.jpg', '.jpeg', '.png', '.webp')):
                    sent_msg = await context.bot.send_photo(chat_id=chat_id, photo=f, caption=caption_text)
                else:
                    sent_msg = await context.bot.send_video(chat_id=chat_id, video=f, caption=caption_text)

            delete_file_later(file_path, delay=10)

        asyncio.create_task(delete_msg_later(context, chat_id, sent_msg.message_id, delay=3600))
        await query.message.delete()

    except Exception as e:
        await query.edit_message_text(f"❌ အမှားအယွင်း ဖြစ်ပေါ်ခဲ့သည်: {str(e)}")

def main():
    if not os.path.exists('downloads'):
        os.makedirs('downloads')

    threading.Thread(target=run_flask, daemon=True).start()

    application = Application.builder().token(TOKEN).build()

    application.add_handler(CommandHandler("start", start))
    application.add_handler(CallbackQueryHandler(language_button, pattern='^lang_'))
    application.add_handler(CallbackQueryHandler(process_download, pattern='^quality_'))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    application.run_polling()

if __name__ == '__main__':
    main()
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text(
        "ကျေးဇူးပြု၍ ဒေါင်းလုဒ်ဆွဲလိုသော Quality သို့မဟုတ် Format ကို ရွေးချယ်ပါ:",
        reply_markup=reply_markup
    )

async def process_download(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    choice = query.data
    url = context.user_data.get('download_url')
    chat_id = update.effective_chat.id

    if not url:
        await query.edit_message_text("Link သက်တမ်းကုန်သွားပါပြီ။ Link ကို ပြန်လည်ပို့ပေးပါ။")
        return

    await query.edit_message_text("🔄 ဒေါင်းလုဒ်ဆွဲနေပါသည်။ ခဏစောင့်ပေးပါ...")

    out_prefix = f"{chat_id}_{query.id}"
    outtmpl = f"downloads/{out_prefix}_%(title)s.%(ext)s"

    if choice == 'quality_mp3':
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': outtmpl,
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'cookiefile': 'cookies.txt' if os.path.exists('cookies.txt') else None,
            'quiet': True,
        }
    else:
        res = choice.split('_')[1]
        ydl_opts = {
            'format': f'bestvideo[height<={res}]+bestaudio/best[height<={res}]/best',
            'outtmpl': outtmpl,
            'cookiefile': 'cookies.txt' if os.path.exists('cookies.txt') else None,
            'quiet': True,
        }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)

        matched_files = glob.glob(f"downloads/{out_prefix}_*")
        if not matched_files:
            await query.edit_message_text("❌ ဒေါင်းလုဒ်ရယူရာတွင် အဆင်မပြေပါ။")
            return

        file_path = matched_files[0]
        filename = os.path.basename(file_path)
        file_size_mb = os.path.getsize(file_path) / (1024 * 1024)

        caption_text = "Bot ကိုအသုံးပြုသည့်အတွက် ကျေးဇူးတင်ပါသည်။"

        if file_size_mb > 50:
            direct_download_url = f"{SERVER_URL}/download/{filename}"
            
            message_text = (
                f"⚠️ **ဖိုင်ဆိုဒ် ({file_size_mb:.1f} MB) ရှိသဖြင့် Telegram Limit ထက်ကျော်လွန်နေပါသည်။**\n\n"
                f"📥 အောက်ပါ Button ကိုနှိပ်ပါက Chrome တွင် Direct Auto Download ရယူပါလိမ့်မည်:\n\n"
                f"{caption_text}"
            )
            
            keyboard = [[InlineKeyboardButton("⬇️ Direct Download (Chrome)", url=direct_download_url)]]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            sent_msg = await context.bot.send_message(
                chat_id=chat_id,
                text=message_text,
                reply_markup=reply_markup,
                parse_mode='Markdown'
            )
            
            delete_file_later(file_path, delay=3600)
        else:
            await query.edit_message_text("📤 Telegram သို့ တင်ပို့နေပါသည်။...")
            
            with open(file_path, 'rb') as f:
                if choice == 'quality_mp3' or file_path.endswith('.mp3'):
                    sent_msg = await context.bot.send_audio(chat_id=chat_id, audio=f, caption=caption_text)
                elif file_path.endswith(('.jpg', '.jpeg', '.png', '.webp')):
                    sent_msg = await context.bot.send_photo(chat_id=chat_id, photo=f, caption=caption_text)
                else:
                    sent_msg = await context.bot.send_video(chat_id=chat_id, video=f, caption=caption_text)

            delete_file_later(file_path, delay=10)

        asyncio.create_task(delete_msg_later(context, chat_id, sent_msg.message_id, delay=3600))
        await query.message.delete()

    except Exception as e:
        await query.edit_message_text(f"❌ အမှားအယွင်း ဖြစ်ပေါ်ခဲ့သည်: {str(e)}")

def main():
    if not os.path.exists('downloads'):
        os.makedirs('downloads')

    threading.Thread(target=run_flask, daemon=True).start()

    application = Application.builder().token(TOKEN).build()

    application.add_handler(CommandHandler("start", start))
    application.add_handler(CallbackQueryHandler(language_button, pattern='^lang_'))
    application.add_handler(CallbackQueryHandler(process_download, pattern='^quality_'))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    application.run_polling()

if __name__ == '__main__':
    main()
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text(
        "ကျေးဇူးပြု၍ ဒေါင်းလုဒ်ဆွဲလိုသော Quality သို့မဟုတ် Format ကို ရွေးချယ်ပါ:",
        reply_markup=reply_markup
    )

async def process_download(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    choice = query.data
    url = context.user_data.get('download_url')
    chat_id = update.effective_chat.id

    if not url:
        await query.edit_message_text("Link သက်တမ်းကုန်သွားပါပြီ။ Link ကို ပြန်လည်ပို့ပေးပါ။")
        return

    await query.edit_message_text("🔄 ဒေါင်းလုဒ်ဆွဲနေပါသည်။ ခဏစောင့်ပေးပါ...")

    out_prefix = f"{chat_id}_{query.id}"
    outtmpl = f"downloads/{out_prefix}_%(title)s.%(ext)s"

    # Format တောင်းဆိုမှု Error မတက်စေရန် Safe format string ပြင်ဆင်ချက်
    if choice == 'quality_mp3':
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': outtmpl,
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'cookiefile': 'cookies.txt' if os.path.exists('cookies.txt') else None,
            'quiet': True,
        }
    else:
        res = choice.split('_')[1]
        # height<=res အရင်ရှာမည်၊ မရှိပါက best သို့မဟုတ် bestvideo+bestaudio သို့ အဆင့်ဆင့် Auto ပြောင်းသွားမည်
        ydl_opts = {
            'format': f'bestvideo[height<={res}]+bestaudio/best[height<={res}]/best',
            'outtmpl': outtmpl,
            'cookiefile': 'cookies.txt' if os.path.exists('cookies.txt') else None,
            'quiet': True,
        }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)

        matched_files = glob.glob(f"downloads/{out_prefix}_*")
        if not matched_files:
            await query.edit_message_text("❌ ဒေါင်းလုဒ်ရယူရာတွင် အဆင်မပြေပါ။")
            return

        file_path = matched_files[0]
        filename = os.path.basename(file_path)
        file_size_mb = os.path.getsize(file_path) / (1024 * 1024)

        caption_text = "Bot ကိုအသုံးပြုသည့်အတွက် ကျေးဇူးတင်ပါသည်။"

        if file_size_mb > 50:
            direct_download_url = f"{SERVER_URL}/download/{filename}"
            
            message_text = (
                f"⚠️ **ဖိုင်ဆိုဒ် ({file_size_mb:.1f} MB) ရှိသဖြင့် Telegram Limit ထက်ကျော်လွန်နေပါသည်။**\n\n"
                f"📥 အောက်ပါ Button ကိုနှိပ်ပါက Chrome တွင် Direct Auto Download ရယူပါလိမ့်မည်:\n\n"
                f"{caption_text}"
            )
            
            keyboard = [[InlineKeyboardButton("⬇️ Direct Download (Chrome)", url=direct_download_url)]]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            sent_msg = await context.bot.send_message(
                chat_id=chat_id,
                text=message_text,
                reply_markup=reply_markup,
                parse_mode='Markdown'
            )
            
            delete_file_later(file_path, delay=3600)
        else:
            await query.edit_message_text("📤 Telegram သို့ တင်ပို့နေပါသည်။...")
            
            with open(file_path, 'rb') as f:
                if choice == 'quality_mp3' or file_path.endswith('.mp3'):
                    sent_msg = await context.bot.send_audio(chat_id=chat_id, audio=f, caption=caption_text)
                elif file_path.endswith(('.jpg', '.jpeg', '.png', '.webp')):
                    sent_msg = await context.bot.send_photo(chat_id=chat_id, photo=f, caption=caption_text)
                else:
                    sent_msg = await context.bot.send_video(chat_id=chat_id, video=f, caption=caption_text)

            delete_file_later(file_path, delay=10)

        asyncio.create_task(delete_msg_later(context, chat_id, sent_msg.message_id, delay=3600))
        await query.message.delete()

    except Exception as e:
        await query.edit_message_text(f"❌ အမှားအယွင်း ဖြစ်ပေါ်ခဲ့သည်: {str(e)}")

def main():
    if not os.path.exists('downloads'):
        os.makedirs('downloads')

    threading.Thread(target=run_flask, daemon=True).start()

    application = Application.builder().token(TOKEN).build()

    application.add_handler(CommandHandler("start", start))
    application.add_handler(CallbackQueryHandler(language_button, pattern='^lang_'))
    application.add_handler(CallbackQueryHandler(process_download, pattern='^quality_'))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    application.run_polling()

if __name__ == '__main__':
    main()
        return

    context.user_data['download_url'] = url

    keyboard = [
        [
            InlineKeyboardButton("🎬 1080p Full HD", callback_data='quality_1080'),
            InlineKeyboardButton("🎬 720p HD", callback_data='quality_720'),
        ],
        [
            InlineKeyboardButton("🎬 480p", callback_data='quality_480'),
            InlineKeyboardButton("🎬 360p", callback_data='quality_360'),
        ],
        [
            InlineKeyboardButton("🎬 240p", callback_data='quality_240'),
            InlineKeyboardButton("🎬 144p", callback_data='quality_144'),
        ],
        [
            InlineKeyboardButton("🎵 MP3 Audio Only", callback_data='quality_mp3'),
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text(
        "ကျေးဇူးပြု၍ ဒေါင်းလုဒ်ဆွဲလိုသော Quality သို့မဟုတ် Format ကို ရွေးချယ်ပါ:",
        reply_markup=reply_markup
    )

# ၄၊ ၅၊ ၆၊ ၇။ ဒေါင်းလုဒ်လုပ်ငန်းစဉ်ကို ဆောင်ရွက်ခြင်း
async def process_download(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    choice = query.data
    url = context.user_data.get('download_url')
    chat_id = update.effective_chat.id

    if not url:
        await query.edit_message_text("Link သက်တမ်းကုန်သွားပါပြီ။ Link ကို ပြန်လည်ပို့ပေးပါ။")
        return

    await query.edit_message_text("🔄 ဒေါင်းလုဒ်ဆွဲနေပါသည်။ ခဏစောင့်ပေးပါ...")

    out_prefix = f"{chat_id}_{query.id}"
    outtmpl = f"downloads/{out_prefix}_%(title)s.%(ext)s"

    # MP3 သို့မဟုတ် Video Quality အလိုက် yt-dlp Options
    if choice == 'quality_mp3':
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': outtmpl,
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'cookiefile': 'cookies.txt' if os.path.exists('cookies.txt') else None,
            'quiet': True,
        }
    else:
        res = choice.split('_')[1]
        ydl_opts = {
            'format': f'bestvideo[height<={res}]+bestaudio/best[height<={res}]/best',
            'outtmpl': outtmpl,
            'cookiefile': 'cookies.txt' if os.path.exists('cookies.txt') else None,
            'quiet': True,
        }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)

        matched_files = glob.glob(f"downloads/{out_prefix}_*")
        if not matched_files:
            await query.edit_message_text("❌ ဒေါင်းလုဒ်ရယူရာတွင် အဆင်မပြေပါ။")
            return

        file_path = matched_files[0]
        filename = os.path.basename(file_path)
        file_size_mb = os.path.getsize(file_path) / (1024 * 1024)

        # ၇။ Caption စာသား
        caption_text = "Bot ကိုအသုံးပြုသည့်အတွက် ကျေးဇူးတင်ပါသည်။"

        # ၅။ ဖိုင်ဆိုဒ် 50MB ထက်ကြီးပါက Chrome မှ Direct Auto Download ပြုလုပ်ပေးမည့် Link
        if file_size_mb > 50:
            direct_download_url = f"{SERVER_URL}/download/{filename}"
            
            message_text = (
                f"⚠️ **ဖိုင်ဆိုဒ် ({file_size_mb:.1f} MB) ရှိသဖြင့် Telegram Limit ထက်ကျော်လွန်နေပါသည်။**\n\n"
                f"📥 အောက်ပါ Button ကိုနှိပ်ပါက Chrome တွင် Direct Auto Download ရယူပါလိမ့်မည်:\n\n"
                f"{caption_text}"
            )
            
            keyboard = [[InlineKeyboardButton("⬇️ Direct Download (Chrome)", url=direct_download_url)]]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            sent_msg = await context.bot.send_message(
                chat_id=chat_id,
                text=message_text,
                reply_markup=reply_markup,
                parse_mode='Markdown'
            )
            
            # 50MB ထက်ကြီးသော ဖိုင်ကို ၁ နာရီအကြာတွင် server ပေါ်မှ auto clear လုပ်ခြင်း
            delete_file_later(file_path, delay=3600)
        else:
            # ၄။ 50MB အောက်ဆိုပါက Telegram ထဲသို့ Video / MP3 / Photo တိုက်ရိုက်ပြန်ပို့ပေးခြင်း
            await query.edit_message_text("📤 Telegram သို့ တင်ပို့နေပါသည်။...")
            
            with open(file_path, 'rb') as f:
                if choice == 'quality_mp3' or file_path.endswith('.mp3'):
                    sent_msg = await context.bot.send_audio(chat_id=chat_id, audio=f, caption=caption_text)
                elif file_path.endswith(('.jpg', '.jpeg', '.png', '.webp')):
                    sent_msg = await context.bot.send_photo(chat_id=chat_id, photo=f, caption=caption_text)
                else:
                    sent_msg = await context.bot.send_video(chat_id=chat_id, video=f, caption=caption_text)

            delete_file_later(file_path, delay=10)

        # ၆။ Telegram တွင် Bot ပြန်ပို့ပေးသော Video/MP3/Message ကို ၁ နာရီအကြာတွင် Auto Clear လုပ်ပေးခြင်း
        asyncio.create_task(delete_msg_later(context, chat_id, sent_msg.message_id, delay=3600))
        
        await query.message.delete()

    except Exception as e:
        await query.edit_message_text(f"❌ အမှားအယွင်း ဖြစ်ပေါ်ခဲ့သည်: {str(e)}")

# -------------------------------------------------------------
# Main Runner
# -------------------------------------------------------------
def main():
    if not os.path.exists('downloads'):
        os.makedirs('downloads')

    threading.Thread(target=run_flask, daemon=True).start()

    application = Application.builder().token(TOKEN).build()

    application.add_handler(CommandHandler("start", start))
    application.add_handler(CallbackQueryHandler(language_button, pattern='^lang_'))
    application.add_handler(CallbackQueryHandler(process_download, pattern='^quality_'))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    application.run_polling()

if __name__ == '__main__':
    main()
