import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

import dotenv from 'dotenv';
dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const WEBHOOK_SECRET_TOKEN = process.env.WEBHOOK_SECRET_TOKEN || '';

if (!BOT_TOKEN) {
  console.error('❌ Xatolik: BOT_TOKEN topilmadi. .env faylini tekshiring.');
  process.exit(1);
}

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const action = process.argv[2] || 'info';

async function main() {
  try {
    if (action === 'set') {
      if (!WEBHOOK_URL) {
        console.error('❌ Xatolik: WEBHOOK_URL topilmadi. .env fayliga Vercel URL manzilingizni kiriting.');
        console.error('Masalan: WEBHOOK_URL=https://your-app.vercel.app/api/webhook');
        process.exit(1);
      }

      console.log(`🔗 Webhook o‘rnatilmoqda: ${WEBHOOK_URL}...`);
      const body = {
        url: WEBHOOK_URL,
        drop_pending_updates: true
      };

      if (WEBHOOK_SECRET_TOKEN) {
        body.secret_token = WEBHOOK_SECRET_TOKEN;
      }

      const res = await fetch(`${TELEGRAM_API}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      console.log('Javob:', data);

      if (data.ok) {
        console.log('✅ Webhook muvaffaqiyatli o‘rnatildi!');
      } else {
        console.error('❌ Webhook o‘rnatishda xatolik:', data.description);
      }
    } else if (action === 'delete') {
      console.log('🗑 Webhook o‘chirilmoqda...');
      const res = await fetch(`${TELEGRAM_API}/deleteWebhook?drop_pending_updates=true`);
      const data = await res.json();
      console.log('Javob:', data);
      if (data.ok) {
        console.log('✅ Webhook o‘chirildi! Endi botni local polling orqali ishlatishingiz mumkin.');
      }
    } else if (action === 'info') {
      console.log('ℹ️ Webhook holati tekshirilmoqda...');
      const res = await fetch(`${TELEGRAM_API}/getWebhookInfo`);
      const data = await res.json();
      console.log('Joriy Webhook holati:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('Noto‘g‘ri buyruq. Mavjud buyruqlar: set, delete, info');
      console.log('Masalan: node scripts/set-webhook.js set');
    }
  } catch (err) {
    console.error('Kutilmagan xatolik:', err);
  }
}

main();
