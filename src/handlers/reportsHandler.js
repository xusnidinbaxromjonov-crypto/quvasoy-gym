import { Markup } from 'telegraf';
import { getPaymentsToday } from '../services/paymentService.js';
import { getExpiringMemberships, getExpiredMemberships } from '../services/membershipService.js';
import { formatUZS, formatPhone, getPaymentMethodLabel, getMembershipTypeLabel, getStatusBadge } from '../utils/formatters.js';
import { formatDateUz, getDaysDifference } from '../utils/dateUtils.js';

export const showPaymentsToday = async (ctx) => {
  const { payments, totalSum } = await getPaymentsToday();

  let text = `📅 <b>BUGUN TO‘LOV QILGANLAR</b>\n\n`;
  text += `💰 <b>Jami tushum:</b> ${formatUZS(totalSum)}\n`;
  text += `🔢 <b>To‘lovlar soni:</b> ${payments.length} ta\n\n`;

  if (payments.length === 0) {
    text += `<i>Bugun hozircha hech qanday to‘lov qayd etilmagan.</i>`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('💳 Yangi to‘lov qilish', 'nav_add_payment')],
      [Markup.button.callback('🔙 Asosiy menyu', 'nav_main_menu')]
    ]);

    if (ctx.callbackQuery) {
      await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard.reply_markup });
    } else {
      await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard.reply_markup });
    }
    return;
  }

  const buttons = [];

  payments.forEach((p, idx) => {
    const memberName = p.member?.full_name || 'Noma’lum mijoz';
    const memberPhone = p.member?.phone ? formatPhone(p.member.phone) : '';
    const type = p.membership?.membership_type ? `(${getMembershipTypeLabel(p.membership.membership_type)})` : '';

    text += `${idx + 1}. <b>${memberName}</b> — <b>${formatUZS(p.amount)}</b>\n`;
    text += `   💳 ${getPaymentMethodLabel(p.payment_method)} ${type}\n`;
    if (p.notes) {
      text += `   📝 <i>${p.notes}</i>\n`;
    }
    text += '\n';

    if (p.member?.id) {
      buttons.push([
        Markup.button.callback(`👤 ${memberName} profilini ochish`, `member_view_${p.member.id}`)
      ]);
    }
  });

  buttons.push([Markup.button.callback('💳 Yangi to‘lov qilish', 'nav_add_payment')]);
  buttons.push([Markup.button.callback('🔙 Asosiy menyu', 'nav_main_menu')]);

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard(buttons).reply_markup
    });
  } else {
    await ctx.reply(text, {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard(buttons).reply_markup
    });
  }
};

export const showExpiringMemberships = async (ctx) => {
  const expiring = await getExpiringMemberships(3);

  let text = `⏳ <b>MUDDATI TUGAYOTGAN OBUNALAR</b> (3 kun ichida)\n\n`;

  if (expiring.length === 0) {
    text += `<i>Yaqin 3 kun ichida muddati tugaydigan obunalar yo‘q. Hamma faol obunalar joyida!</i>`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🔙 Asosiy menyu', 'nav_main_menu')]
    ]);

    if (ctx.callbackQuery) {
      await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard.reply_markup });
    } else {
      await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard.reply_markup });
    }
    return;
  }

  text += `Jami: <b>${expiring.length} ta</b> mijoz obunasi tugamoqda:\n\n`;

  const buttons = [];

  expiring.forEach((ms, idx) => {
    const member = ms.member;
    const diff = getDaysDifference(ms.expiration_date);
    let diffText = '';

    if (diff === 0) {
      diffText = '⚠️ <b>Bugun tugaydi!</b>';
    } else if (diff === 1) {
      diffText = '⏳ <b>1 kun qoldi!</b>';
    } else {
      diffText = `⏳ <b>${diff} kun qoldi</b>`;
    }

    text += `${idx + 1}. <b>${member?.full_name || 'Noma’lum'}</b>\n`;
    text += `   📞 ${formatPhone(member?.phone)} | ${diffText}\n`;
    text += `   📅 Tugash sanasi: ${formatDateUz(ms.expiration_date)}\n\n`;

    if (member?.id) {
      buttons.push([
        Markup.button.callback(
          `🔄 ${member.full_name} — Obunani yangilash`,
          `member_renew_${member.id}`
        )
      ]);
    }
  });

  buttons.push([Markup.button.callback('🔙 Asosiy menyu', 'nav_main_menu')]);

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard(buttons).reply_markup
    });
  } else {
    await ctx.reply(text, {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard(buttons).reply_markup
    });
  }
};

export const showExpiredMemberships = async (ctx) => {
  const expired = await getExpiredMemberships(15);

  let text = `❌ <b>MUDDATI TUGAGAN OBUNALAR</b>\n\n`;

  if (expired.length === 0) {
    text += `<i>Hozirda muddati o‘tgan obunalar mavjud emas.</i>`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🔙 Asosiy menyu', 'nav_main_menu')]
    ]);

    if (ctx.callbackQuery) {
      await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard.reply_markup });
    } else {
      await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard.reply_markup });
    }
    return;
  }

  text += `Muddati o‘tgan obunalar (so‘nggi 15 ta):\n\n`;

  const buttons = [];

  expired.forEach((ms, idx) => {
    const member = ms.member;
    const diff = Math.abs(getDaysDifference(ms.expiration_date));

    text += `${idx + 1}. <b>${member?.full_name || 'Noma’lum'}</b>\n`;
    text += `   📞 ${formatPhone(member?.phone)}\n`;
    text += `   🔴 Tugagan sana: ${formatDateUz(ms.expiration_date)} (${diff} kun avval)\n\n`;

    if (member?.id) {
      buttons.push([
        Markup.button.callback(
          `🔄 ${member.full_name} — Yangilash`,
          `member_renew_${member.id}`
        )
      ]);
    }
  });

  buttons.push([Markup.button.callback('🔙 Asosiy menyu', 'nav_main_menu')]);

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard(buttons).reply_markup
    });
  } else {
    await ctx.reply(text, {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard(buttons).reply_markup
    });
  }
};
