import https from 'https';
import { Telegraf } from 'telegraf';
import { config, validateConfig } from './config.js';
import { authMiddleware } from './middleware/auth.js';
import { sessionMiddleware } from './middleware/session.js';
import { mainMenuKeyboard } from './keyboards/replyKeyboards.js';

// Handlers
import { handleStartCommand, handleHelpCommand, handleNavigationCallback } from './handlers/menuHandler.js';
import {
  startRegistration,
  handleRegistrationInput,
  handleRegistrationCallback
} from './handlers/registrationWizard.js';
import {
  startPaymentFlow,
  handlePaymentInput,
  handlePaymentCallback
} from './handlers/paymentWizard.js';
import {
  showMembersList,
  handleMemberCallback,
  handleMemberEditInput,
  handleMemberEditCallback
} from './handlers/memberHandler.js';
import { promptSearch, handleSearchInput } from './handlers/searchHandler.js';
import {
  showPaymentsToday,
  showExpiringMemberships,
  showExpiredMemberships
} from './handlers/reportsHandler.js';
import { showStatistics } from './handlers/statsHandler.js';
import {
  showAdminSettings,
  handleAdminCallback,
  handleAddAdminInput
} from './handlers/adminHandler.js';

validateConfig();

// Use IPv4 HTTPS Agent to prevent DNS/IPv6 connection timeouts on Windows
const agent = new https.Agent({
  keepAlive: true,
  family: 4
});

export const bot = new Telegraf(config.botToken || 'PLACEHOLDER_TOKEN', {
  telegram: { agent }
});

// Global Error Handler
bot.catch((err, ctx) => {
  console.error(`[Telegraf Error] Update ${ctx?.update?.update_id}:`, err);
  try {
    ctx.reply(
      '⚠️ Kutilmagan texnik xatolik yuz berdi. Iltimos, qaytadan urinib ko‘ring.',
      mainMenuKeyboard()
    );
  } catch (replyErr) {
    console.error('[Telegraf Error] Failed to send error message:', replyErr);
  }
});

// 1. Security & Authentication Middleware
bot.use(authMiddleware);

// 2. Persistent Supabase Session Middleware
bot.use(sessionMiddleware);

// 3. Command Handlers
bot.command('start', handleStartCommand);
bot.command('help', handleHelpCommand);
bot.command('stats', showStatistics);
bot.command('search', promptSearch);

// 4. Main Menu Text Buttons
bot.hears('➕ Mijoz qo‘shish', startRegistration);
bot.hears('💳 To‘lov qilish / To‘lovni qayd etish', (ctx) => startPaymentFlow(ctx));
bot.hears('👥 Mijozlar ro‘yxati', (ctx) => showMembersList(ctx, 1, 'all'));
bot.hears('🔍 Mijozni qidirish', promptSearch);
bot.hears('📅 Bugun to‘lov qilganlar', showPaymentsToday);
bot.hears('⏳ Muddati tugayotgan obunalar', showExpiringMemberships);
bot.hears('❌ Muddati tugagan obunalar', showExpiredMemberships);
bot.hears('📊 Statistika', showStatistics);
bot.hears('⚙️ Admin sozlamalari', showAdminSettings);
bot.hears('❌ Bekor qilish', async (ctx) => {
  ctx.session = null;
  await ctx.reply('❌ Amal bekor qilindi.', mainMenuKeyboard());
});

// 5. Contact Message Handler (for phone sharing during registration)
bot.on('contact', async (ctx) => {
  const handled = await handleRegistrationInput(ctx);
  if (!handled) {
    await ctx.reply('Kontakt qabul qilindi.');
  }
});

// 6. Callback Query Router
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery?.data;
  if (!data) return;

  // 1. Navigation callbacks
  if (await handleNavigationCallback(ctx)) return;

  // 2. Registration wizard callbacks
  if (await handleRegistrationCallback(ctx)) return;

  // 3. Payment wizard callbacks
  if (await handlePaymentCallback(ctx)) return;

  // 4. Member profile & pagination callbacks
  if (await handleMemberCallback(ctx)) return;

  // 5. Member edit callbacks
  if (await handleMemberEditCallback(ctx)) return;

  // 6. Admin settings callbacks
  if (await handleAdminCallback(ctx, bot)) return;

  // Fallback
  await ctx.answerCbQuery();
});

// 7. General Text Message Router for Active Wizards
bot.on('text', async (ctx, next) => {
  const wizard = ctx.session?.wizard;
  if (!wizard) {
    return next();
  }

  // Check registration wizard
  if (wizard === 'registration') {
    const handled = await handleRegistrationInput(ctx);
    if (handled) return;
  }

  // Check payment wizard
  if (wizard === 'payment') {
    const handled = await handlePaymentInput(ctx);
    if (handled) return;
  }

  // Check member edit wizard
  if (wizard === 'edit_member' || wizard === 'adjust_date') {
    const handled = await handleMemberEditInput(ctx);
    if (handled) return;
  }

  // Check search wizard
  if (wizard === 'search') {
    const handled = await handleSearchInput(ctx);
    if (handled) return;
  }

  // Check add admin wizard
  if (wizard === 'add_admin') {
    const handled = await handleAddAdminInput(ctx);
    if (handled) return;
  }

  return next();
});
