# 🎥 Kino Bot - Telegram Movie Bot

O'zbek tilidagi to'liq funksiyali Telegram kino boti.

## 🚀 Xususiyatlar

### Foydalanuvchi uchun:
- 🔍 Kino qidirish (nomi yoki kodi orqali)
- 📂 Kategoriyalar (janrlar bo'yicha)
- 🆕 Yangi qo'shilgan kinolar
- ⭐ Sevimlilar ro'yxati
- 📤 Do'stlarga ulashish
- 🔎 Inline qidiruv

### Admin uchun:
- ➕ Kino qo'shish (wizard orqali)
- 🗑️ Kino o'chirish
- 📊 Statistika
- 📢 Reklama (broadcast)
- 🚫 Foydalanuvchini ban/unban qilish
- ⭐ Top kinolar ro'yxati

## 📦 O'rnatish

### 1. Loyihani yuklab oling
```bash
git clone <repo-url>
cd kino-bot
```

### 2. Bog'liqliklarni o'rnating
```bash
npm install
```

### 3. `.env` faylini sozlang
`.env.example` faylidan nusxa oling va to'ldiring:
```bash
cp .env.example .env
```

`.env` fayli:
```env
BOT_TOKEN=your_bot_token_here
MONGODB_URI=your_mongodb_uri_here
ADMIN_ID=your_telegram_id_here
PORT=3000
```

- **BOT_TOKEN**: @BotFather dan oling
- **MONGODB_URI**: MongoDB Atlas yoki lokal MongoDB manzili (masalan: `mongodb://localhost:27017/kinobot`)
- **ADMIN_ID**: Sizning Telegram ID raqamingiz (@userinfobot dan oling)

### 4. Botni ishga tushiring
```bash
npm start
```

## 🛠 Admin Panel

Admin paneliga kirish uchun:
1. Telegram'da botga `/admin` buyrug'ini yuboring
2. (Faqat ADMIN_ID ga mos kelgan foydalanuvchi uchun ishlaydi)

### Kino qo'shish:
1. "➕ Kino qo'shish" tugmasini bosing
2. Bot so'ragan ma'lumotlarni ketma-ket kiriting:
   - Kino nomi
   - Kino kodi (unikal raqam)
   - Yili
   - Janri
   - Tavsifi
   - Video fayli yoki havolasi
   - Poster rasmi

### Kino o'chirish:
```
/delete_123
```
(123 o'rniga kino kodini yozing)

### Reklama yuborish:
```
/broadcast Xabar matni
```

### Foydalanuvchini ban qilish:
```
/ban 123456789
/unban 123456789
```

## 📁 Loyiha tuzilmasi

```
kino-bot/
├── index.js              # Kirish nuqtasi
├── package.json
├── .env
├── .env.example
├── README.md
└── src/
    ├── bot/
    │   ├── bot.js        # Telegraf bot sozlamalari
    │   └── middleware.js # Auth middleware
    ├── commands/
    │   ├── admin.js      # Admin buyruqlari
    │   ├── start.js      # Start buyrug'i
    │   ├── user.js       # Foydalanuvchi buyruqlari
    │   └── category.js   # Kategoriyalar
    ├── scenes/
    │   └── addMovieScene.js  # Kino qo'shish wizardi
    ├── models/
    │   ├── User.js
    │   ├── Movie.js
    │   ├── Category.js
    │   └── Favorite.js
    ├── services/
    │   ├── userService.js
    │   └── movieService.js
    ├── config/
    │   └── db.js         # MongoDB ulanish
    └── utils/
```

## 🌐 Deploy

### Render.com uchun:
1. Loyihani GitHub'ga yuklang
2. Render.com'da Web Service yarating
3. Environment variables qo'shing
4. Start command: `npm start`

### Uptime Robot:
Bot doimiy ishlashi uchun `/` endpoint'ini ping qiling.

## 📝 Litsenziya

ISC
