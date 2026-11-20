import dotenv from 'dotenv';
dotenv.config();

import { bot } from '../src/bot.js';
import { config, validateConfig } from '../src/config.js';

console.log('====================================================');
console.log('🏋️ QUVASOY GYM — TELEGRAM BOT (Mahalliy rejim / Long Polling)');
console.log('====================================================');

validateConfig();

console.log(`🤖 Bot ishga tushirilmoqda...`);
console.log(`⏰ Vaqt mintaqasi: ${config.timezone}`);
console.log(`👑 Bosh adminlar: ${config.adminTelegramIds.join(', ') || 'Belgilanmagan'}`);

bot
  .launch({ dropPendingUpdates: true })
  .then(() => {
    console.log('✅ Bot muvaffaqiyatli ishga tushdi va xabarlarni kutmoqda!');
    console.log('Telegram ilovasida botingizga /start buyrug‘ini yuboring.');
    console.log('To‘xtatish uchun: Ctrl + C bosing.');
  })
  .catch((err) => {
    console.error('❌ Botni ishga tushirishda xatolik:', err);
    process.exit(1);
  });

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
