import { Markup } from 'telegraf';
import { searchMembers } from '../services/memberService.js';
import { formatPhone, getStatusBadge } from '../utils/formatters.js';
import { cancelKeyboard, mainMenuKeyboard } from '../keyboards/replyKeyboards.js';

export const promptSearch = async (ctx) => {
  ctx.session = {
    wizard: 'search',
    step: 'QUERY'
  };

  await ctx.reply(
    '🔍 <b>MIJOZNI QIDIRISH</b>\n\n' +
      'Mijozning <b>ism-familiyasi</b> yoki <b>telefon raqamini</b> kiriting:\n' +
      '<i>(Masalan: Azizbek yoki 901234567)</i>',
    {
      parse_mode: 'HTML',
      reply_markup: cancelKeyboard().reply_markup
    }
  );
};

export const handleSearchInput = async (ctx) => {
  if (ctx.session?.wizard !== 'search') return false;

  const text = ctx.message?.text?.trim();

  if (text === '❌ Bekor qilish') {
    ctx.session = null;
    await ctx.reply('❌ Qidiruv bekor qilindi.', mainMenuKeyboard());
    return true;
  }

  if (!text || text.length < 2) {
    await ctx.reply('⚠️ Kamida 2 ta belgi kiriting:');
    return true;
  }

  const results = await searchMembers(text);
  ctx.session = null;

  if (results.length === 0) {
    await ctx.reply(
      `🔍 "<b>${text}</b>" bo‘yicha hech qanday mijoz topilmadi.`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '➕ Yangi mijoz qo‘shish', callback_data: 'nav_add_member' }],
            [{ text: '🔍 Boshqa qidiruv', callback_data: 'nav_search' }],
            [{ text: '🔙 Asosiy menyu', callback_data: 'nav_main_menu' }]
          ]
        }
      }
    );
    return true;
  }

  let resultMsg = `🔍 <b>QIDIRUV NATIJALARI:</b> ${results.length} ta mijoz topildi.\n\n`;

  const buttons = results.slice(0, 10).map((m, idx) => {
    const badge = m.currentMembership
      ? getStatusBadge(m.currentMembership.status, m.currentMembership.expiration_date)
      : '⚪ Obunasiz';

    resultMsg += `${idx + 1}. <b>${m.full_name}</b>\n`;
    resultMsg += `   📞 ${formatPhone(m.phone)} | ${badge}\n\n`;

    return [
      Markup.button.callback(
        `👤 ${m.full_name} (${formatPhone(m.phone)})`,
        `member_view_${m.id}`
      )
    ];
  });

  buttons.push([Markup.button.callback('🔍 Qaytadan qidirish', 'nav_search')]);
  buttons.push([Markup.button.callback('🔙 Asosiy menyu', 'nav_main_menu')]);

  await ctx.reply(resultMsg, {
    parse_mode: 'HTML',
    reply_markup: Markup.inlineKeyboard(buttons).reply_markup
  });

  return true;
};
