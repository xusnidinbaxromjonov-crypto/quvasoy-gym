# 🏋️ QUVASOY GYM — TELEGRAM MEMBERSHIP MANAGEMENT BOT

Professional Telegram bot for **Quvasoy Gym** to manage gym memberships, member registrations, payments, expiration dates, and automated administrator notifications.

Replaces manual SMS-based and notebook records with a clean, automated digital system built on **Node.js (Telegraf)**, **Supabase PostgreSQL**, and **Vercel Serverless Functions**.

---

## 📋 MUNDARIJA / TABLE OF CONTENTS

1. [Loyiha haqida (About the Project)](#-loyiha-haqida)
2. [Texnologiyalar (Technology Stack)](#-texnologiyalar)
3. [Funksiyalar va Imkoniyatlar (Features)](#-funksiyalar-va-imkoniyatlar)
4. [Loyiha tuzilishi (Project Structure)](#-loyiha-tuzilishi)
5. [Supabase Ma’lumotlar bazasini sozlash (Database Setup)](#-supabase-malumotlar-bazasini-sozlash)
6. [Telegram Bot yaratish (BotFather Setup)](#-telegram-bot-yaratish)
7. [Mahalliy ishlab chiqish (Local Development)](#-mahalliy-ishlab-chiqish)
8. [Vercel-ga deploy qilish (Vercel Deployment)](#-vercel-ga-deploy-qilish)
9. [Webhook-ni sozlash (Webhook Setup)](#-webhook-ni-sozlash)
10. [Avtomatlashtirilgan bildirishnomalar (Cron Expiration Alerts)](#-avtomatlashtirilgan-bildirishnomalar)
11. [Xavfsizlik (Security)](#-xavfsizlik)

---

## 🎯 LOYIHA HAQIDA

Quvasoy Gym a’zolik tariflari:
- ⚡ **Bir martalik / Kunlik obuna:** 15 000 so‘m (1 kunlik amal qilish muddati)
- 🏋️ **Oylik obuna:** 150 000 so‘m (1 oylik amal qilish muddati)

### Asosiy biznes mantiq:
- **Faol obunani uzaytirish:** Agar mijozning oylik obunasi tugashiga hali vaqt bor bo‘lsa va u yana to‘lov qilsa, yangi obuna muddati to‘lov kunidan emas, balki **amaldagi tugash sanasidan boshlab 1 oyga uzaytiriladi**.
- **Muddati o‘tgan obuna:** Agar obuna muddati o‘tib ketgan bo‘lsa, yangi obuna to‘lov qilingan kundan boshlab hisoblanadi.
- **Takrorlanishning oldini olish (No duplicates):** Bir xil telefon raqam bilan yangi mijoz qo‘shilmaydi. Agar mavjud bo‘lsa, bot profilni ochish yoki to‘lovni qayd etishni taklif qiladi.
- **Admin xavfsizligi:** Bot faqat ruxsat berilgan Telegram administratorlar uchun ishlaydi. Begona foydalanuvchilarga maxsus xushkelibsiz xabari ko‘rsatiladi va buyruqlar bloklanadi.

---

## 🛠 TEXNOLOGIYALAR

- **Dasturlash tili:** Node.js (ES Modules)
- **Telegram Bot Framework:** [Telegraf](https://telegraf.js.org/) v4
- **Ma’lumotlar bazasi:** [Supabase PostgreSQL](https://supabase.com/)
- **Deploy platformasi:** [Vercel Serverless Functions](https://vercel.com/)
- **Vaqt va sanalar:** Dayjs (Asia/Tashkent UTC+5 mintaqasi bilan)
- **Sessiya saqlash:** Supabase `bot_sessions` jadvali (Serverless muhitda sessiyalar yo‘qolmaydi)

---

## ✨ FUNKSIYALAR VA IMKONIYATLAR

### 1. Asosiy Menyu (Uzbek Language UI)
- `➕ Mijoz qo‘shish` — Yangi a’zoni bosqichma-bosqich ro‘yxatga olish
- `💳 To‘lov qilish / To‘lovni qayd etish` — Obunani yangilash va to‘lov kiritish
- `👥 Mijozlar ro‘yxati` — Sahifalangan ro‘yxat va faollik filtrlari
- `🔍 Mijozni qidirish` — Ism, telefon yoki Telegram ID bo‘yicha tezkor qidiruv
- `📅 Bugun to‘lov qilganlar` — Kunlik barcha to‘lovlar va jami kassa
- `⏳ Muddati tugayotgan obunalar` — Yaqin 3 kun ichida tugaydigan a’zolar
- `❌ Muddati tugagan obunalar` — Obunasi tugagan mijozlar ro‘yxati
- `📊 Statistika` — Moliyaviy va a’zolik bo‘yicha to‘liq dashboard
- `⚙️ Admin sozlamalari` — Adminlarni boshqarish va bildirishnomalarni qo‘lda yuborish

### 2. To‘lov kvitansiyasi (Receipt)
To‘lov tasdiqlangandan so‘ng chiroyli formatlangan chek chiqariladi:
```text
💳 TO‘LOV TASDIQLANDI

👤 Mijoz: Azizbek Karimov
📞 Telefon: +998 (90) 123-45-67
🏋️ Obuna: Oylik
💰 To‘lov: 150 000 so‘m
💳 Usul: 💵 Naqd pul
📅 Boshlanish: 20.11.2026
⏳ Tugash: 20.12.2026
✅ Holat: 🟢 Faol (30 kun qoldi)
```

---

## 📂 LOYIHA TUZILISHI

```text
quvasoy-gym/
├── api/
│   ├── webhook.js               # Vercel serverless Telegram webhook
│   └── cron/
│       └── check-expirations.js # Vercel cron: har kuni ertalabki tekshiruv
├── src/
│   ├── config.js                # Muhit o'zgaruvchilari va sozlamalar
│   ├── constants.js             # Narxlar, tariflar, statuslar
│   ├── supabase.js              # Supabase Client (Service Role)
│   ├── bot.js                   # Telegraf bot asosiy instansiyasi va marshrutlash
│   ├── middleware/
│   │   ├── auth.js              # Admin tekshiruvi (Telegram ID va DB bo'yicha)
│   │   └── session.js           # Supabase-ga asoslangan doimiy sessiya
│   ├── services/
│   │   ├── adminService.js      # Adminlarni qo'shish va tekshirish
│   │   ├── memberService.js     # Mijozlar CRUD va qidiruv
│   │   ├── membershipService.js # Obunani hisoblash, uzaytirish, muddatlar
│   │   ├── notificationService.js # Anti-spam bildirishnomalar tizimi
│   │   └── paymentService.js    # To'lovlar tarixi va moliyaviy hisobotlar
│   ├── handlers/
│   │   ├── menuHandler.js       # Asosiy menyu va navigatsiya
│   │   ├── registrationWizard.js# "Mijoz qo'shish" 8 bosqichli vizardi
│   │   ├── paymentWizard.js     # "To'lov qilish" vizardi
│   │   ├── memberHandler.js     # Profil, tahrirlash, muddatni o'zgartirish
│   │   ├── searchHandler.js     # Ism va telefon bo'yicha qidiruv
│   │   ├── reportsHandler.js    # Bugungi to'lovlar, tugayotgan va tugaganlar
│   │   ├── statsHandler.js      # Statistika dashboard
│   │   └── adminHandler.js      # Admin sozlamalari
│   ├── keyboards/
│   │   ├── replyKeyboards.js    # Reply tugmalar (Kontakt ulashish, bekor qilish)
│   │   └── inlineKeyboards.js   # Inline menyular, profillar, sahifalash
│   └── utils/
│       ├── dateUtils.js         # Tashkent vaqt mintaqasi, sanalar arifmetikasi
│       ├── formatters.js        # So'm valyutasi, telefon formatlash
│       └── phoneValidator.js    # O'zbekiston telefon raqamlari validatori
├── scripts/
│   ├── set-webhook.js           # Webhook o'rnatish, o'chirish va holatni tekshirish
│   ├── test-local.js            # Mahalliy Long Polling rejimida sinash
│   ├── verify-logic.js          # Mantiqiy unit-testlar
│   └── verify-imports.js        # Modullarni tekshirish skripti
├── database.sql                 # Barcha jadvallar, triggerlar va indekslar
├── vercel.json                  # Vercel serverless va cron konfiguratsiyasi
├── package.json
└── .env.example
```

---

## 🗄 SUPABASE MA’LUMOTLAR BAZASINI SOZLASH

1. [Supabase](https://supabase.com/) saytiga kiring va yangi loyiha (Project) yarating:
   - Masalan: `quvasoy-gym`
   - Parol o‘rnating va mintaqani (Region) tanlang (masalan, `Frankfurt` yoki eng yaqin mintaqa).
2. Loyiha ochilgach, chap menyudan **SQL Editor** bo‘limiga o‘ting.
3. Loyihamizdagi [`database.sql`](./database.sql) faylining butun tarkibini nusxalab, SQL Editor oynasiga joylashtiring.
4. **Run** tugmasini bosing.
   - Bu barcha jadvallarni (`members`, `memberships`, `payments`, `admins`, `notifications`, `bot_sessions`), indekslarni, RLS xavfsizlik qoidalarini va triggerlarni avtomatik yaratadi.
5. Loyiha sozlamalaridan API kalitlarini oling:
   - **Project Settings** -> **API** bo‘limiga kiring:
   - **Project URL:** `https://your-project-id.supabase.co`
   - **Project API keys:** `service_role` (Secret) kalitini nusxalang.
     *(Diqqat: `anon` emas, aynan `service_role` kalitidan foydalaning, chunki bot admin huquqi bilan bazaga ma’lumot yozadi).*

---

## 🤖 TELEGRAM BOT YARATISH

1. Telegramda [@BotFather](https://t.me/BotFather) botiga kiring.
2. `/newbot` buyrug‘ini yuboring.
3. Bot nomini kiriting: `Quvasoy Gym Management`
4. Bot username-ini kiriting: `quvasoy_gym_bot` (yoki band bo‘lmagan boshqa nom).
5. BotFather bergan **BOT TOKEN**ni nusxalab oling.
6. O‘zingizning Telegram ID raqamingizni aniqlang:
   - Telegramda [@userinfobot](https://t.me/userinfobot) botiga `/start` yuborsangiz, sizning `Id` raqamingizni ko‘rsatadi (masalan: `123456789`).

---

## 💻 MAHALLIY ISHLAB CHIQISH (LOCAL DEVELOPMENT)

1. Loyiha papkasida `.env` faylini yarating:
   ```bash
   cp .env.example .env
   ```
2. `.env` faylini o‘z kalitlaringiz bilan to‘ldiring:
   ```env
   BOT_TOKEN=1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
   ADMIN_TELEGRAM_IDS=123456789
   CRON_SECRET=quvasoy_gym_cron_secret_2026
   ```
3. Kutubxonalarni o‘rnatish:
   ```bash
   npm install
   ```
4. Mantiqiy testlarni ishga tushirib ko‘ring:
   ```bash
   node scripts/verify-logic.js
   ```
5. Botni mahalliy rejimda (Long Polling) ishga tushiring:
   ```bash
   npm run dev
   ```
6. Telegramda botingizga `/start` yuborib, barcha funksiyalarni bemalol sinab ko‘ring!

---

## 🚀 VERCEL-GA DEPLOY QILISH

Bot Vercel Serverless Functions asosida 24/7 rejimda server talab qilmasdan bepul/arzon ishlaydi.

### 1-usul: Vercel CLI orqali
```bash
npm i -g vercel
vercel login
vercel
```

### 2-usul: GitHub orqali (Tavsiya etiladi)
1. Ushbu loyihani shaxsiy GitHub repozitoriyingizga yuklang (`git push`).
2. [Vercel Dashboard](https://vercel.com/) ga kiring va **Add New...** -> **Project** tugmasini bosing.
3. GitHub repozitoriyangizni tanlang.
4. **Environment Variables** bo‘limiga quyidagi o‘zgaruvchilarni qo‘shing:
   - `BOT_TOKEN`: Telegram bot tokeni
   - `SUPABASE_URL`: Supabase URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase service_role kaliti
   - `ADMIN_TELEGRAM_IDS`: Bosh adminlarning Telegram ID lari (vergul bilan)
   - `CRON_SECRET`: Vercel cron uchun maxfiy kalit
   - `WEBHOOK_URL`: `https://sizning-loyihangiz.vercel.app/api/webhook`
   - `WEBHOOK_SECRET_TOKEN`: Telegram xavfsizlik kaliti (ixtiyoriy)
5. **Deploy** tugmasini bosing.

---

## 🔗 WEBHOOK-NI SOZLASH

Vercel-ga loyiha muvaffaqiyatli deploy bo‘lgach, Telegram-ga yangi Webhook manzilini xabar qilish kerak:

1. Mahalliy `.env` faylingizdagi `WEBHOOK_URL` ga Vercel bergan domenni kiriting:
   ```env
   WEBHOOK_URL=https://quvasoy-gym-bot.vercel.app/api/webhook
   ```
2. Webhook-ni o‘rnatish buyrug‘ini bajaring:
   ```bash
   npm run webhook:set
   ```
3. Webhook holatini tekshirish:
   ```bash
   npm run webhook:info
   ```
   Agar `"has_custom_certificate": false` va `"pending_update_count": 0` bo‘lsa, demak bot to‘liq ishlashga tayyor!

*(Mahalliy sinov rejimiga qaytish uchun `npm run webhook:delete` qilsangiz yetarli).*

---

## ⏰ AVTOMATLASHTIRILGAN BILDIRISHNOMALAR (CRON)

Loyihada har kuni avtomatik ravishda obunalar holatini tekshiruvchi Vercel Cron Job sozlangan ([`vercel.json`](./vercel.json)):
```json
{
  "crons": [
    {
      "path": "/api/cron/check-expirations",
      "schedule": "0 4 * * *"
    }
  ]
}
```
> *UTC 04:00 vaqti — O‘zbekiston (Toshkent UTC+5) vaqti bilan har kuni soat **09:00** ga to‘g‘ri keladi.*

### Bildirishnoma turlari:
1. ⏳ **3 kun qolganda:** Obuna muddati tugashiga 3 kun qolgani haqida ogohlantirish.
2. ⚠️ **1 kun qolganda:** Obuna ertaga tugashi haqida ogohlantirish.
3. 🚨 **Tugash kunida (Bugun):** Obuna bugun tugayotgani haqida eslatma.
4. ❌ **Muddati o‘tganda:** Muddati tugagan obunalar haqida xabar.

### Anti-spam va takrorlanish himoyasi:
Barcha yuborilgan xabarlar `notifications` jadvalida saqlanadi:
`UNIQUE (membership_id, notification_type, target_date)`
Shu sababli adminga bitta eslatma qayta-qayta yuborilmaydi va bot adminni bezovta qilmaydi.

Qo‘shimcha tarzda, administrator xohlagan paytda **⚙️ Admin sozlamalari** -> **🔔 Bildirishnomalarni hozir yuborish** tugmasini bosib, tekshiruvni qo‘lda ham ishga tushirishi mumkin.

---

## 🔒 XAVFSIZLIK

1. **Telegram ID autentifikatsiyasi:** Barcha buyruqlar, xabarlar va callback tugmalar backenddagi `authMiddleware` orqali tekshiriladi.
2. **Ruxsatsiz foydalanuvchilar:** Botga kirgan begona kishilarga faqatgina:
   *"Assalomu alaykum! Quvasoy Gym boshqaruv botiga xush kelibsiz. Bu bot faqat administratorlar uchun."*
   xabari chiqadi va hech qanday ma’lumot ko‘rsatilmaydi.
3. **Yashirin kalitlar:** Hech qanday `service_role` kaliti yoki bot tokeni kod ichida ochiq yozilmagan.
4. **Serverless Sessiyalar:** Ma’lumotlar bazasida saqlanuvchi `bot_sessions` tufayli Vercel-dagi serverless funksiyalar qayta yuklanganda ham mijoz qo‘shish yoki to‘lov jarayoni uzilib qolmaydi.
