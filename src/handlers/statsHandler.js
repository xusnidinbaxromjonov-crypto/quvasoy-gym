import { Markup } from 'telegraf';
import { getFinancialStatistics } from '../services/paymentService.js';
import { formatUZS } from '../utils/formatters.js';

export const showStatistics = async (ctx) => {
  const stats = await getFinancialStatistics();

  let text = `📊 <b>QUVASOY GYM — STATISTIKA</b>\n`;
  text += `<i>Haqiqiy vaqt rejimida yangilangan ma’lumotlar</i>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  text += `👥 <b>Mijozlar hisoboti:</b>\n`;
  text += `• Jami ro‘yxatdagi mijozlar: <b>${stats.totalMembers} ta</b>\n`;
  text += `• Faol oylik obunalar (+): <b>${stats.activeMonthly} ta</b>\n`;
  text += `• Faol haftalik obunalar (+): <b>${stats.activeWeekly} ta</b>\n`;
  text += `• 3 kun ichida tugaydiganlar: <b>${stats.expiring3Days} ta</b> ⏳\n`;
  text += `• Balansi 0 bo‘lganlar (tugagan): <b>${stats.expiredCount} ta</b> 🔴\n\n`;

  text += `💰 <b>Moliyaviy hisobot:</b>\n`;
  text += `• Bugungi tushum: <b>${formatUZS(stats.incomeToday)}</b>\n`;
  text += `• Haftalik tushum: <b>${formatUZS(stats.incomeThisWeek)}</b>\n`;
  text += `• Oylik tushum: <b>${formatUZS(stats.incomeThisMonth)}</b>\n\n`;

  text += `📈 <b>Sotuvlar hajmi (joriy oy):</b>\n`;
  text += `• Haftalik obuna sotuvlari: <b>${stats.weeklySalesCount} ta</b>\n`;
  text += `• Oylik obuna sotuvlari: <b>${stats.monthlySalesCount} ta</b>\n`;

  text += `━━━━━━━━━━━━━━━━━━━━━`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🔄 Yangilash', 'stats_refresh')],
    [Markup.button.callback('📅 Bugun to‘lov qilganlar', 'nav_today_payments')],
    [Markup.button.callback('🔙 Asosiy menyu', 'nav_main_menu')]
  ]);

  if (ctx.callbackQuery) {
    try {
      await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        reply_markup: keyboard.reply_markup
      });
    } catch (e) {
      await ctx.reply(text, {
        parse_mode: 'HTML',
        reply_markup: keyboard.reply_markup
      });
    }
  } else {
    await ctx.reply(text, {
      parse_mode: 'HTML',
      reply_markup: keyboard.reply_markup
    });
  }
};
