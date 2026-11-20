import { Markup } from 'telegraf';
import { MEMBERSHIP_TYPES, MEMBERSHIP_PRICES, PAYMENT_METHODS } from '../constants.js';
import { formatUZS, formatPhone, getMembershipTypeLabel, getPaymentMethodLabel, createPaymentConfirmationCard } from '../utils/formatters.js';
import { getTodayDateString, calculateMembershipDates, formatDateUz } from '../utils/dateUtils.js';
import { findMemberById, searchMembers } from '../services/memberService.js';
import { createOrRenewMembership } from '../services/membershipService.js';
import { recordPayment } from '../services/paymentService.js';
import { mainMenuKeyboard, cancelKeyboard, skipOrCancelKeyboard } from '../keyboards/replyKeyboards.js';
import { membershipTypeInlineKeyboard, paymentMethodInlineKeyboard } from '../keyboards/inlineKeyboards.js';

export const startPaymentFlow = async (ctx, memberId = null) => {
  if (memberId) {
    const member = await findMemberById(memberId);
    if (!member) {
      await ctx.reply('⚠️ Mijoz topilmadi.');
      return;
    }

    ctx.session = {
      wizard: 'payment',
      step: 'MEMBERSHIP_TYPE',
      data: {
        memberId: member.id,
        fullName: member.full_name,
        phone: member.phone,
        currentExpiration: member.currentMembership?.expiration_date || null
      }
    };

    let intro =
      `💳 <b>TO‘LOVNI QAYD ETISH</b>\n\n` +
      `👤 <b>Mijoz:</b> ${member.full_name}\n` +
      `📞 <b>Telefon:</b> ${formatPhone(member.phone)}\n`;

    if (member.currentMembership?.expiration_date) {
      intro += `⏳ <b>Joriy obuna tugash sanasi:</b> ${formatDateUz(member.currentMembership.expiration_date)}\n`;
    }

    intro += `\nObuna turini tanlang:`;

    await ctx.reply(intro, {
      parse_mode: 'HTML',
      reply_markup: membershipTypeInlineKeyboard('renew').reply_markup
    });
    return;
  }

  // If no memberId provided, prompt admin to search/enter phone or name
  ctx.session = {
    wizard: 'payment',
    step: 'SEARCH_MEMBER',
    data: {}
  };

  await ctx.reply(
    '💳 <b>TO‘LOV QILISH / TO‘LOVNI QAYD ETISH</b>\n\n' +
      'Mijozning <b>ism-familiyasini</b> yoki <b>telefon raqamini</b> kiriting:',
    {
      parse_mode: 'HTML',
      reply_markup: cancelKeyboard().reply_markup
    }
  );
};

export const handlePaymentInput = async (ctx) => {
  const wizard = ctx.session?.wizard;
  const step = ctx.session?.step;

  if (wizard !== 'payment') return false;

  const text = ctx.message?.text?.trim();

  if (text === '❌ Bekor qilish') {
    ctx.session = null;
    await ctx.reply('❌ To‘lov bekor qilindi.', mainMenuKeyboard());
    return true;
  }

  // STEP: SEARCH MEMBER
  if (step === 'SEARCH_MEMBER') {
    if (!text || text.length < 2) {
      await ctx.reply('⚠️ Kamida 2 ta belgi kiriting:');
      return true;
    }

    const results = await searchMembers(text);
    if (results.length === 0) {
      await ctx.reply(
        `🔍 "<b>${text}</b>" bo‘yicha hech kim topilmadi.\n` +
          'Balki yangi mijoz qo‘shish kerakdir?',
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '➕ Yangi mijoz qo‘shish', callback_data: 'nav_add_member' }],
              [{ text: '🔙 Asosiy menyu', callback_data: 'nav_main_menu' }]
            ]
          }
        }
      );
      return true;
    }

    const buttons = results.map((m) => [
      Markup.button.callback(
        `👤 ${m.full_name} (${formatPhone(m.phone)})`,
        `renew_select_${m.id}`
      )
    ]);
    buttons.push([Markup.button.callback('❌ Bekor qilish', 'renew_cancel')]);

    await ctx.reply(
      `🔍 <b>Qidiruv natijalari:</b> ${results.length} ta mijoz topildi.\nTo‘lov qilmoqchi bo‘lgan mijozni tanlang:`,
      {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard(buttons).reply_markup
      }
    );
    return true;
  }

  // STEP: AMOUNT
  if (step === 'AMOUNT') {
    let amount = 0;
    if (text) {
      amount = Number(text.replace(/\D/g, ''));
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      await ctx.reply('⚠️ Iltimos, to‘lov summasini so‘mda to‘g‘ri kiriting (faqat raqamlar):');
      return true;
    }

    ctx.session.data.amount = amount;
    ctx.session.step = 'PAYMENT_METHOD';

    await ctx.reply(
      `💰 <b>To‘lov summasi:</b> ${formatUZS(amount)}\n\n` +
        'To‘lov usulini tanlang:',
      {
        parse_mode: 'HTML',
        reply_markup: paymentMethodInlineKeyboard('renew').reply_markup
      }
    );
    return true;
  }

  // STEP: NOTE
  if (step === 'NOTE') {
    let note = null;
    if (text && text !== '⏭ O‘tkazib yuborish') {
      note = text;
    }

    ctx.session.data.note = note;
    ctx.session.step = 'CONFIRM';

    const pData = ctx.session.data;
    const dates = calculateMembershipDates(
      pData.membershipType,
      getTodayDateString(),
      pData.currentExpiration
    );

    pData.startDate = dates.startDate;
    pData.expirationDate = dates.expirationDate;
    pData.isExtended = dates.isExtended;

    let summary =
      '📋 <b>TO‘LOVNI TASDIQLASH</b>\n\n' +
      `👤 <b>Mijoz:</b> ${pData.fullName}\n` +
      `📞 <b>Telefon:</b> ${formatPhone(pData.phone)}\n` +
      `🏋️ <b>Obuna:</b> ${getMembershipTypeLabel(pData.membershipType)}\n` +
      `💰 <b>Summa:</b> ${formatUZS(pData.amount)}\n` +
      `💳 <b>Usul:</b> ${getPaymentMethodLabel(pData.paymentMethod)}\n` +
      `📅 <b>Boshlanish:</b> ${formatDateUz(pData.startDate)}\n` +
      `⏳ <b>Yangi tugash sanasi:</b> ${formatDateUz(pData.expirationDate)}\n`;

    if (pData.isExtended) {
      summary += `<i>ℹ️ Amaldagi obuna muddati ${formatDateUz(pData.currentExpiration)} dan boshlab 1 oyga uzaytirildi.</i>\n`;
    }

    if (note) {
      summary += `📝 <b>Izoh:</b> ${note}\n`;
    }

    await ctx.reply(summary, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ To‘lovni tasdiqlash', callback_data: 'renew_confirm' }],
          [{ text: '❌ Bekor qilish', callback_data: 'renew_cancel' }]
        ]
      }
    });
    return true;
  }

  return false;
};

export const handlePaymentCallback = async (ctx) => {
  const data = ctx.callbackQuery?.data;
  if (!data || !data.startsWith('renew_')) return false;

  await ctx.answerCbQuery();

  if (data === 'renew_cancel') {
    ctx.session = null;
    await ctx.reply('❌ To‘lov bekor qilindi.', mainMenuKeyboard());
    return true;
  }

  // SELECT MEMBER FROM SEARCH
  if (data.startsWith('renew_select_')) {
    const memberId = data.replace('renew_select_', '');
    return startPaymentFlow(ctx, memberId);
  }

  // MEMBERSHIP TYPE SELECTION
  if (data.startsWith('renew_type_')) {
    const type = data.replace('renew_type_', '');
    const price = MEMBERSHIP_PRICES[type] || 0;

    if (!ctx.session) ctx.session = { wizard: 'payment', data: {} };
    ctx.session.data.membershipType = type;
    ctx.session.data.amount = price;
    ctx.session.step = 'AMOUNT';

    await ctx.reply(
      `🏋️ <b>Obuna turi:</b> ${getMembershipTypeLabel(type)}\n\n` +
        `To‘lov summasini kiriting yoki standart narxni tasdiqlang:\n` +
        `Standart narx: <b>${formatUZS(price)}</b>`,
      {
        parse_mode: 'HTML',
        reply_markup: Markup.keyboard([[String(price)], ['❌ Bekor qilish']]).resize().reply_markup
      }
    );
    return true;
  }

  // PAYMENT METHOD SELECTION
  if (data.startsWith('renew_pay_')) {
    const method = data.replace('renew_pay_', '');
    if (!ctx.session) ctx.session = { wizard: 'payment', data: {} };
    ctx.session.data.paymentMethod = method;
    ctx.session.step = 'NOTE';

    await ctx.reply(
      `💳 <b>To‘lov usuli:</b> ${getPaymentMethodLabel(method)}\n\n` +
        'Qo‘shimcha <b>izoh</b> kiriting yoki o‘tkazib yuboring:',
      {
        parse_mode: 'HTML',
        reply_markup: skipOrCancelKeyboard().reply_markup
      }
    );
    return true;
  }

  // CONFIRMATION AND EXECUTE
  if (data === 'renew_confirm') {
    if (!ctx.session?.data) {
      await ctx.reply('⚠️ Sessiya topilmadi. Qaytadan urinib ko‘ring.', mainMenuKeyboard());
      return true;
    }

    const pData = ctx.session.data;
    const adminTelegramId = ctx.from.id;

    try {
      // 1. Create or renew membership (with extension logic!)
      const { membership, isExtended } = await createOrRenewMembership({
        memberId: pData.memberId,
        membershipType: pData.membershipType,
        paymentDate: pData.startDate,
        price: pData.amount
      });

      // 2. Record payment
      await recordPayment({
        memberId: pData.memberId,
        membershipId: membership.id,
        amount: pData.amount,
        paymentMethod: pData.paymentMethod,
        paymentDate: getTodayDateString(),
        registeredByTelegramId: adminTelegramId,
        notes: pData.note
      });

      // 3. Send confirmation receipt
      const card = createPaymentConfirmationCard({
        fullName: pData.fullName,
        phone: pData.phone,
        membershipType: pData.membershipType,
        amount: pData.amount,
        startDate: membership.start_date,
        expirationDate: membership.expiration_date,
        paymentMethod: pData.paymentMethod,
        note: pData.note
      });

      ctx.session = null;

      await ctx.reply(card, {
        parse_mode: 'HTML',
        reply_markup: mainMenuKeyboard()
      });

      return true;
    } catch (err) {
      console.error('[Renew Error]', err);
      await ctx.reply(
        `❌ To‘lovni saqlashda xatolik: ${err.message || 'Xatolik yuz berdi'}`,
        mainMenuKeyboard()
      );
      ctx.session = null;
      return true;
    }
  }

  return false;
};
