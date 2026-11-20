import { mainMenuKeyboard } from '../keyboards/replyKeyboards.js';
import { startRegistration } from './registrationWizard.js';
import { startPaymentFlow } from './paymentWizard.js';
import { showMembersList } from './memberHandler.js';
import { promptSearch } from './searchHandler.js';
import { showPaymentsToday, showExpiringMemberships, showExpiredMemberships } from './reportsHandler.js';
import { showStatistics } from './statsHandler.js';
import { showAdminSettings } from './adminHandler.js';

export const handleStartCommand = async (ctx) => {
  ctx.session = null;

  const welcomeMessage =
    `Assalomu alaykum, hurmatli administrator! 🏋️‍♂️\n\n` +
    `<b>Quvasoy Gym</b> a’zolik va to‘lovlarni boshqarish tizimiga xush kelibsiz.\n\n` +
    `Quyidagi menyu orqali kerakli bo‘limni tanlang:`;

  await ctx.reply(welcomeMessage, {
    parse_mode: 'HTML',
    reply_markup: mainMenuKeyboard().reply_markup
  });
};

export const handleHelpCommand = async (ctx) => {
  const helpMessage =
    `ℹ️ <b>QUVASOY GYM BOT — YO‘RIQNOMA</b>\n\n` +
    `• <b>➕ Mijoz qo‘shish:</b> Yangi a’zoni ro‘yxatga olish, obuna va birinchi to‘lovni kiritish.\n` +
    `• <b>💳 To‘lov qilish:</b> Mavjud mijoz uchun to‘lov qabul qilish va obunasini uzaytirish.\n` +
    `• <b>👥 Mijozlar ro‘yxati:</b> Barcha mijozlar, ularning obuna holati va profili.\n` +
    `• <b>🔍 Mijozni qidirish:</b> Ism yoki telefon raqami bo‘yicha tezkor qidiruv.\n` +
    `• <b>📅 Bugun to‘lov qilganlar:</b> Bugungi barcha tushumlar va mijozlar hisoboti.\n` +
    `• <b>⏳ Muddati tugayotgan obunalar:</b> 3 kun ichida tugaydigan a’zoliklar.\n` +
    `• <b>❌ Muddati tugagan obunalar:</b> Qarzdor / muddati o‘tgan mijozlar.\n` +
    `• <b>📊 Statistika:</b> Jami mijozlar, daromadlar va obuna turlari hisoboti.\n` +
    `• <b>⚙️ Admin sozlamalari:</b> Adminlarni boshqarish va bildirishnomalarni tekshirish.\n\n` +
    `<i>Savollar yoki texnik muammolar bo‘lsa, tizim administratoriga murojaat qiling.</i>`;

  await ctx.reply(helpMessage, {
    parse_mode: 'HTML',
    reply_markup: mainMenuKeyboard().reply_markup
  });
};

export const handleNavigationCallback = async (ctx) => {
  const data = ctx.callbackQuery?.data;
  if (!data) return false;

  if (data === 'noop') {
    await ctx.answerCbQuery();
    return true;
  }

  if (data === 'nav_main_menu') {
    await ctx.answerCbQuery();
    ctx.session = null;
    await handleStartCommand(ctx);
    return true;
  }

  if (data === 'nav_add_member') {
    await ctx.answerCbQuery();
    await startRegistration(ctx);
    return true;
  }

  if (data === 'nav_add_payment') {
    await ctx.answerCbQuery();
    await startPaymentFlow(ctx);
    return true;
  }

  if (data === 'nav_search') {
    await ctx.answerCbQuery();
    await promptSearch(ctx);
    return true;
  }

  if (data === 'nav_today_payments') {
    await ctx.answerCbQuery();
    await showPaymentsToday(ctx);
    return true;
  }

  if (data === 'nav_admin_settings') {
    await ctx.answerCbQuery();
    await showAdminSettings(ctx);
    return true;
  }

  if (data === 'stats_refresh') {
    await ctx.answerCbQuery('Statistika yangilandi!');
    await showStatistics(ctx);
    return true;
  }

  return false;
};
