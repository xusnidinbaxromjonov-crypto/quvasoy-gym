import { Markup } from 'telegraf';
import { getAdminsList, addAdmin } from '../services/adminService.js';
import { checkAndSendExpirationNotifications } from '../services/notificationService.js';
import { adminSettingsKeyboard } from '../keyboards/inlineKeyboards.js';
import { mainMenuKeyboard, cancelKeyboard } from '../keyboards/replyKeyboards.js';
import { config } from '../config.js';

export const showAdminSettings = async (ctx) => {
  let text = `⚙️ <b>ADMIN SOZLAMALARI</b>\n\n`;
  text += `🏋️ <b>Klub:</b> Quvasoy Gym\n`;
  text += `💰 <b>Oylik obuna narxi:</b> 150 000 so‘m (1 oy)\n`;
  text += `⏰ <b>Vaqt mintaqasi:</b> Tashkent (UTC+5)\n\n`;
  text += `Quyidagi amallardan birini tanlang:`;

  if (ctx.callbackQuery) {
    try {
      await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        reply_markup: adminSettingsKeyboard().reply_markup
      });
    } catch (e) {
      await ctx.reply(text, {
        parse_mode: 'HTML',
        reply_markup: adminSettingsKeyboard().reply_markup
      });
    }
  } else {
    await ctx.reply(text, {
      parse_mode: 'HTML',
      reply_markup: adminSettingsKeyboard().reply_markup
    });
  }
};

export const handleAdminCallback = async (ctx, botInstance) => {
  const data = ctx.callbackQuery?.data;
  if (!data) return false;

  // View admins list
  if (data === 'admin_list') {
    await ctx.answerCbQuery();
    const dbAdmins = await getAdminsList();

    let text = `👥 <b>ADMINISTRATORLAR RO‘YXATI</b>\n\n`;
    text += `<b>Asosiy adminlar (ENV):</b>\n`;
    config.adminTelegramIds.forEach((id) => {
      text += `• ID: <code>${id}</code> (Superadmin)\n`;
    });

    text += `\n<b>Qo‘shilgan adminlar (DB):</b>\n`;
    if (dbAdmins.length === 0) {
      text += `<i>Hozircha qo‘shimcha adminlar yo‘q.</i>\n`;
    } else {
      dbAdmins.forEach((a, idx) => {
        const status = a.is_active ? '🟢 Faol' : '🔴 Faolsiz';
        text += `${idx + 1}. <b>${a.full_name}</b> (ID: <code>${a.telegram_id}</code>) — ${status}\n`;
      });
    }

    await ctx.reply(text, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ Yangi admin qo‘shish', callback_data: 'admin_add' }],
          [{ text: '⚙️ Sozlamalarga qaytish', callback_data: 'nav_admin_settings' }]
        ]
      }
    });
    return true;
  }

  // Add new admin wizard
  if (data === 'admin_add') {
    await ctx.answerCbQuery();
    ctx.session = {
      wizard: 'add_admin',
      step: 'TELEGRAM_ID',
      data: {}
    };

    await ctx.reply(
      '➕ <b>YANGI ADMIN QO‘SHISH</b>\n\n' +
        '1/2. Yangi adminning <b>Telegram ID</b> raqamini kiriting:\n' +
        '<i>(Foydalanuvchi o‘z ID sini @userinfobot orqali bilib olishi mumkin)</i>',
      {
        parse_mode: 'HTML',
        reply_markup: cancelKeyboard().reply_markup
      }
    );
    return true;
  }

  // Manually trigger expiration check & notifications right now
  if (data === 'admin_trigger_notifs') {
    await ctx.answerCbQuery('Bildirishnomalar tekshirilmoqda...');
    await ctx.reply('⏳ Obuna muddatlari tekshirilmoqda va ogohlantirishlar yuborilmoqda...');

    const res = await checkAndSendExpirationNotifications(botInstance);

    if (res.success) {
      await ctx.reply(
        `✅ <b>Tekshiruv yakunlandi!</b>\n\n` +
          `Yuborilgan ogohlantirishlar: <b>${res.count} ta</b>\n` +
          (res.logs?.length > 0 ? `\n<i>${res.logs.join('\n')}</i>` : ''),
        {
          parse_mode: 'HTML',
          reply_markup: adminSettingsKeyboard().reply_markup
        }
      );
    } else {
      await ctx.reply(
        `❌ Bildirishnoma yuborishda xatolik: ${res.error || res.message}`,
        { reply_markup: adminSettingsKeyboard().reply_markup }
      );
    }
    return true;
  }

  return false;
};

export const handleAddAdminInput = async (ctx) => {
  const wizard = ctx.session?.wizard;
  const step = ctx.session?.step;

  if (wizard !== 'add_admin') return false;

  const text = ctx.message?.text?.trim();

  if (text === '❌ Bekor qilish') {
    ctx.session = null;
    await ctx.reply('❌ Admin qo‘shish bekor qilindi.', mainMenuKeyboard());
    return true;
  }

  if (step === 'TELEGRAM_ID') {
    const tgId = Number(text);
    if (!tgId || isNaN(tgId) || tgId <= 0) {
      await ctx.reply('⚠️ Noto‘g‘ri Telegram ID! Faqat musbat raqamlardan iborat bo‘lishi kerak:');
      return true;
    }

    ctx.session.data.telegramId = tgId;
    ctx.session.step = 'FULL_NAME';

    await ctx.reply(
      `🆔 Telegram ID: <code>${tgId}</code>\n\n` +
        '2/2. Yangi adminning <b>ism va familiyasini</b> kiriting:',
      {
        parse_mode: 'HTML',
        reply_markup: cancelKeyboard().reply_markup
      }
    );
    return true;
  }

  if (step === 'FULL_NAME') {
    if (!text || text.length < 2) {
      await ctx.reply('⚠️ Kamida 2 ta harf kiriting:');
      return true;
    }

    const { telegramId } = ctx.session.data;
    const fullName = text;

    const res = await addAdmin({ telegramId, fullName });
    ctx.session = null;

    if (res.success) {
      await ctx.reply(
        `✅ <b>Yangi administrator muvaffaqiyatli qo‘shildi!</b>\n\n` +
          `👤 Ism: <b>${fullName}</b>\n` +
          `🆔 Telegram ID: <code>${telegramId}</code>`,
        {
          parse_mode: 'HTML',
          reply_markup: mainMenuKeyboard()
        }
      );
    } else {
      await ctx.reply(`❌ Xatolik yuz berdi: ${res.error}`, mainMenuKeyboard());
    }
    return true;
  }

  return false;
};
