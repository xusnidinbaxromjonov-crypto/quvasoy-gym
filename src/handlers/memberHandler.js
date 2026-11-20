import { Markup } from 'telegraf';
import {
  findMemberById,
  getMembersList,
  updateMember,
  toggleMemberActive
} from '../services/memberService.js';
import { adjustExpirationDate } from '../services/membershipService.js';
import { getMemberPaymentHistory } from '../services/paymentService.js';
import {
  formatUZS,
  formatPhone,
  getStatusBadge,
  getMembershipTypeLabel,
  getPaymentMethodLabel
} from '../utils/formatters.js';
import { formatDateUz } from '../utils/dateUtils.js';
import {
  memberProfileInlineKeyboard,
  memberListPaginationKeyboard
} from '../keyboards/inlineKeyboards.js';
import { mainMenuKeyboard, cancelKeyboard } from '../keyboards/replyKeyboards.js';
import { startPaymentFlow } from './paymentWizard.js';

export const showMemberProfile = async (ctx, memberId) => {
  const member = await findMemberById(memberId);
  if (!member) {
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery('Mijoz topilmadi!', { show_alert: true });
    } else {
      await ctx.reply('⚠️ Mijoz topilmadi.');
    }
    return;
  }

  const ms = member.currentMembership;
  const lp = member.lastPayment;

  let text = `👤 <b>MIJOZ PROFILI</b>\n\n`;
  text += `📛 <b>Ism:</b> ${member.full_name}\n`;
  text += `📞 <b>Telefon:</b> ${formatPhone(member.phone)}\n`;
  text += `📌 <b>Faollik:</b> ${member.is_active ? 'Faol mijoz' : 'Faolsizlantirilgan'}\n\n`;

  text += `🏋️ <b>Obuna holati:</b>\n`;
  if (ms) {
    text += `• Turi: ${getMembershipTypeLabel(ms.membership_type)}\n`;
    text += `• Boshlanish: ${formatDateUz(ms.start_date)}\n`;
    text += `• Tugash: ${formatDateUz(ms.expiration_date)}\n`;
    text += `• Holat: ${getStatusBadge(ms.status, ms.expiration_date)}\n`;
  } else {
    text += `• <i>Obuna mavjud emas</i>\n`;
  }

  text += `\n💰 <b>So‘nggi to‘lov:</b>\n`;
  if (lp) {
    text += `• Summa: ${formatUZS(lp.amount)}\n`;
    text += `• Sana: ${formatDateUz(lp.payment_date)}\n`;
    text += `• Usul: ${getPaymentMethodLabel(lp.payment_method)}\n`;
  } else {
    text += `• <i>To‘lov tarixi mavjud emas</i>\n`;
  }

  if (member.notes) {
    text += `\n📝 <b>Izoh:</b> ${member.notes}\n`;
  }

  const keyboard = memberProfileInlineKeyboard(member);

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

export const showMembersList = async (ctx, page = 1, filter = 'all') => {
  const result = await getMembersList({ page, limit: 6, filter });

  if (result.members.length === 0) {
    const emptyMsg =
      filter === 'active_only'
        ? '👥 Hozirda faol obunaga ega mijozlar mavjud emas.'
        : '👥 Hozirda ro‘yxatda hech qanday mijoz yo‘q.';

    if (ctx.callbackQuery) {
      await ctx.editMessageText(emptyMsg, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '➕ Yangi mijoz qo‘shish', callback_data: 'nav_add_member' }],
            [{ text: '🔙 Asosiy menyu', callback_data: 'nav_main_menu' }]
          ]
        }
      });
    } else {
      await ctx.reply(emptyMsg, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '➕ Yangi mijoz qo‘shish', callback_data: 'nav_add_member' }]
          ]
        }
      });
    }
    return;
  }

  let text = `👥 <b>MIJOZLAR RO‘YXATI</b> (Jami: ${result.total} ta)\n`;
  text += filter === 'active_only' ? '<i>(Faqat faol obunalar)</i>\n\n' : '\n';

  result.members.forEach((m, idx) => {
    const num = (page - 1) * 6 + idx + 1;
    const badge = m.currentMembership
      ? getStatusBadge(m.currentMembership.status, m.currentMembership.expiration_date)
      : '⚪ Obunasiz';
    text += `${num}. <b>${m.full_name}</b>\n`;
    text += `   📞 ${formatPhone(m.phone)} | ${badge}\n`;
  });

  // Buttons to view individual members
  const memberButtons = result.members.map((m) => [
    Markup.button.callback(`👤 ${m.full_name}`, `member_view_${m.id}`)
  ]);

  // Pagination row
  const paginationKeyboard = memberListPaginationKeyboard(page, result.totalPages, filter);
  const combinedKeyboard = Markup.inlineKeyboard([
    ...memberButtons,
    ...paginationKeyboard.reply_markup.inline_keyboard
  ]);

  if (ctx.callbackQuery) {
    try {
      await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        reply_markup: combinedKeyboard.reply_markup
      });
    } catch (e) {
      await ctx.reply(text, {
        parse_mode: 'HTML',
        reply_markup: combinedKeyboard.reply_markup
      });
    }
  } else {
    await ctx.reply(text, {
      parse_mode: 'HTML',
      reply_markup: combinedKeyboard.reply_markup
    });
  }
};

export const handleMemberCallback = async (ctx) => {
  const data = ctx.callbackQuery?.data;
  if (!data) return false;

  // View member
  if (data.startsWith('member_view_')) {
    await ctx.answerCbQuery();
    const memberId = data.replace('member_view_', '');
    await showMemberProfile(ctx, memberId);
    return true;
  }

  // Renew / Record payment for member
  if (data.startsWith('member_renew_') || data.startsWith('member_payment_')) {
    await ctx.answerCbQuery();
    const memberId = data.replace('member_renew_', '').replace('member_payment_', '');
    await startPaymentFlow(ctx, memberId);
    return true;
  }

  // Toggle active status
  if (data.startsWith('member_toggleactive_')) {
    const memberId = data.replace('member_toggleactive_', '');
    const member = await findMemberById(memberId);
    if (!member) {
      await ctx.answerCbQuery('Mijoz topilmadi!');
      return true;
    }

    const newStatus = !member.is_active;
    await toggleMemberActive(memberId, newStatus);
    await ctx.answerCbQuery(newStatus ? 'Mijoz faollashtirildi!' : 'Mijoz faolsizlantirildi!');
    await showMemberProfile(ctx, memberId);
    return true;
  }

  // View payment history
  if (data.startsWith('member_history_')) {
    await ctx.answerCbQuery();
    const memberId = data.replace('member_history_', '');
    const member = await findMemberById(memberId);
    const history = await getMemberPaymentHistory(memberId, 10);

    let histText = `📜 <b>TO‘LOVLAR TARIXI: ${member?.full_name || ''}</b>\n\n`;

    if (history.length === 0) {
      histText += '<i>Hozircha hech qanday to‘lov amalga oshirilmagan.</i>';
    } else {
      history.forEach((p, idx) => {
        histText += `${idx + 1}. <b>${formatUZS(p.amount)}</b> (${getPaymentMethodLabel(p.payment_method)})\n`;
        histText += `   📅 Sana: ${formatDateUz(p.payment_date)}\n`;
        if (p.membership?.membership_type) {
          histText += `   🏋️ Turi: ${getMembershipTypeLabel(p.membership.membership_type)}\n`;
        }
        if (p.notes) {
          histText += `   📝 Izoh: ${p.notes}\n`;
        }
        histText += '\n';
      });
    }

    await ctx.reply(histText, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '👤 Profilga qaytish', callback_data: `member_view_${memberId}` }],
          [{ text: '🔙 Asosiy menyu', callback_data: 'nav_main_menu' }]
        ]
      }
    });
    return true;
  }

  // Adjust Expiration Date
  if (data.startsWith('member_adjustdate_')) {
    await ctx.answerCbQuery();
    const memberId = data.replace('member_adjustdate_', '');
    const member = await findMemberById(memberId);

    if (!member?.currentMembership) {
      await ctx.reply('⚠️ Ushbu mijozda amaldagi obuna yo‘q. Avval obuna oching.');
      return true;
    }

    ctx.session = {
      wizard: 'adjust_date',
      data: {
        memberId,
        membershipId: member.currentMembership.id,
        currentExpiration: member.currentMembership.expiration_date
      }
    };

    await ctx.reply(
      `📅 <b>OBUNA MUDDATINI O‘ZGARTIRISH</b>\n\n` +
        `👤 Mijoz: <b>${member.full_name}</b>\n` +
        `⏳ Amaldagi tugash sanasi: <b>${formatDateUz(member.currentMembership.expiration_date)}</b>\n\n` +
        `Yangi tugash sanasini <b>DD.MM.YYYY</b> shaklida kiriting:\n<i>(Masalan: 25.12.2026)</i>`,
      {
        parse_mode: 'HTML',
        reply_markup: cancelKeyboard().reply_markup
      }
    );
    return true;
  }

  // Edit member
  if (data.startsWith('member_edit_')) {
    await ctx.answerCbQuery();
    const memberId = data.replace('member_edit_', '');
    const member = await findMemberById(memberId);

    ctx.session = {
      wizard: 'edit_member',
      step: 'CHOICE',
      data: { memberId }
    };

    await ctx.reply(
      `✏️ <b>MIJOZ MA’LUMOTLARINI TAHRIRLASH:</b>\n\n` +
        `👤 Ism: <b>${member.full_name}</b>\n` +
        `📞 Telefon: <b>${formatPhone(member.phone)}</b>\n` +
        `📝 Izoh: <b>${member.notes || 'Yo‘q'}</b>\n\n` +
        `Qaysi ma’lumotni o‘zgartirmoqchisiz?`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📛 Ismni o‘zgartirish', callback_data: `edit_field_name_${memberId}` }],
            [{ text: '📞 Telefonni o‘zgartirish', callback_data: `edit_field_phone_${memberId}` }],
            [{ text: '📝 Izohni o‘zgartirish', callback_data: `edit_field_notes_${memberId}` }],
            [{ text: '🔙 Profilga qaytish', callback_data: `member_view_${memberId}` }]
          ]
        }
      }
    );
    return true;
  }

  // Pagination navigation
  if (data.startsWith('members_page_')) {
    await ctx.answerCbQuery();
    const parts = data.replace('members_page_', '').split('_');
    const page = parseInt(parts[0], 10) || 1;
    const filter = parts.slice(1).join('_') || 'all';
    await showMembersList(ctx, page, filter);
    return true;
  }

  // Filter navigation
  if (data.startsWith('members_filter_')) {
    await ctx.answerCbQuery();
    const filter = data.replace('members_filter_', '');
    await showMembersList(ctx, 1, filter);
    return true;
  }

  return false;
};

export const handleMemberEditInput = async (ctx) => {
  const wizard = ctx.session?.wizard;
  if (wizard !== 'edit_member' && wizard !== 'adjust_date') return false;

  const text = ctx.message?.text?.trim();

  if (text === '❌ Bekor qilish') {
    const memberId = ctx.session.data.memberId;
    ctx.session = null;
    await ctx.reply('❌ Amal bekor qilindi.', mainMenuKeyboard());
    if (memberId) await showMemberProfile(ctx, memberId);
    return true;
  }

  // ADJUST DATE
  if (wizard === 'adjust_date') {
    // Parse DD.MM.YYYY
    let newDate = null;
    const parts = text.split('.');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      newDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    } else if (text.includes('-')) {
      newDate = text;
    }

    if (!newDate || isNaN(new Date(newDate).getTime())) {
      await ctx.reply('⚠️ Noto‘g‘ri sana formati! DD.MM.YYYY shaklida kiriting:\n<i>Masalan: 30.12.2026</i>', {
        parse_mode: 'HTML'
      });
      return true;
    }

    const { memberId, membershipId } = ctx.session.data;
    try {
      await adjustExpirationDate(membershipId, newDate);
      ctx.session = null;
      await ctx.reply(`✅ <b>Tugash sanasi muvaffaqiyatli yangilandi:</b> ${formatDateUz(newDate)}`, {
        parse_mode: 'HTML',
        reply_markup: mainMenuKeyboard()
      });
      await showMemberProfile(ctx, memberId);
    } catch (err) {
      await ctx.reply(`❌ Xatolik yuz berdi: ${err.message}`, mainMenuKeyboard());
    }
    return true;
  }

  // EDIT MEMBER FIELDS
  if (wizard === 'edit_member') {
    const field = ctx.session.data.field;
    const memberId = ctx.session.data.memberId;

    try {
      if (field === 'name') {
        if (!text || text.length < 3) {
          await ctx.reply('⚠️ Kamida 3 ta harf kiriting:');
          return true;
        }
        await updateMember(memberId, { fullName: text });
        await ctx.reply('✅ Ism yangilandi!', mainMenuKeyboard());
      } else if (field === 'phone') {
        await updateMember(memberId, { phone: text });
        await ctx.reply('✅ Telefon raqam yangilandi!', mainMenuKeyboard());
      } else if (field === 'notes') {
        await updateMember(memberId, { notes: text === '-' ? null : text });
        await ctx.reply('✅ Izoh yangilandi!', mainMenuKeyboard());
      }

      ctx.session = null;
      await showMemberProfile(ctx, memberId);
    } catch (err) {
      await ctx.reply(`❌ Xatolik: ${err.message}`, mainMenuKeyboard());
    }
    return true;
  }

  return false;
};

export const handleMemberEditCallback = async (ctx) => {
  const data = ctx.callbackQuery?.data;
  if (!data || !data.startsWith('edit_field_')) return false;

  await ctx.answerCbQuery();
  const parts = data.replace('edit_field_', '').split('_');
  const field = parts[0];
  const memberId = parts[1];

  ctx.session = {
    wizard: 'edit_member',
    data: { memberId, field }
  };

  const prompts = {
    name: 'Yangi ism-familiyani kiriting:',
    phone: 'Yangi telefon raqamini kiriting (+998...):',
    notes: 'Yangi izohni kiriting (o‘chirish uchun - deb yozing):'
  };

  await ctx.reply(prompts[field] || 'Yangi qiymatni kiriting:', {
    reply_markup: cancelKeyboard().reply_markup
  });
  return true;
};
