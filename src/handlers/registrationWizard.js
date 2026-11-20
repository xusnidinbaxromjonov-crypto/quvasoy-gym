import { Markup } from 'telegraf';
import { MEMBERSHIP_TYPES, MEMBERSHIP_PRICES, PAYMENT_METHODS } from '../constants.js';
import { normalizePhone, isValidUzPhone } from '../utils/phoneValidator.js';
import { getTodayDateString, calculateMembershipDates, formatDateUz } from '../utils/dateUtils.js';
import { formatUZS, formatPhone, getMembershipTypeLabel, getPaymentMethodLabel, createPaymentConfirmationCard } from '../utils/formatters.js';
import { createMember, findMemberByPhone } from '../services/memberService.js';
import { createOrRenewMembership } from '../services/membershipService.js';
import { recordPayment } from '../services/paymentService.js';
import {
  mainMenuKeyboard,
  contactRequestKeyboard,
  cancelKeyboard,
  skipOrCancelKeyboard
} from '../keyboards/replyKeyboards.js';
import {
  membershipTypeInlineKeyboard,
  paymentMethodInlineKeyboard,
  registrationConfirmInlineKeyboard
} from '../keyboards/inlineKeyboards.js';

/**
 * Steps:
 * 1. NAME
 * 2. PHONE
 * 3. MEMBERSHIP_TYPE (inline)
 * 4. AMOUNT (text or default click)
 * 5. PAYMENT_METHOD (inline)
 * 6. START_DATE (text or 'bugun')
 * 7. NOTE (text or skip)
 * 8. CONFIRMATION (inline)
 */

export const startRegistration = async (ctx) => {
  ctx.session = {
    wizard: 'registration',
    step: 'NAME',
    data: {}
  };

  await ctx.reply(
    '➕ <b>YANGI MIJOZ QO‘SHISH</b>\n\n' +
      '1/7. Mijozning <b>ism va familiyasini</b> kiriting:\n<i>(Masalan: Azizbek Karimov)</i>',
    {
      parse_mode: 'HTML',
      reply_markup: cancelKeyboard().reply_markup
    }
  );
};

export const handleRegistrationInput = async (ctx) => {
  const wizard = ctx.session?.wizard;
  const step = ctx.session?.step;

  if (wizard !== 'registration') return false;

  const text = ctx.message?.text?.trim();

  // Cancel check
  if (text === '❌ Bekor qilish') {
    ctx.session = null;
    await ctx.reply('❌ Ro‘yxatga olish bekor qilindi.', mainMenuKeyboard());
    return true;
  }

  // STEP 1: NAME
  if (step === 'NAME') {
    if (!text || text.length < 3) {
      await ctx.reply('⚠️ Iltimos, mijozning to‘liq ism-familiyasini to‘g‘ri kiriting (kamida 3 harf):');
      return true;
    }

    ctx.session.data.fullName = text;
    ctx.session.step = 'PHONE';

    await ctx.reply(
      `👤 <b>Mijoz:</b> ${text}\n\n` +
        '2/7. Mijozning <b>telefon raqamini</b> yuboring yoki kiriting:\n' +
        '<i>(Masalan: +998901234567 yoki 901234567)</i>',
      {
        parse_mode: 'HTML',
        reply_markup: contactRequestKeyboard().reply_markup
      }
    );
    return true;
  }

  // STEP 2: PHONE
  if (step === 'PHONE') {
    let rawPhone = null;

    if (ctx.message?.contact?.phone_number) {
      rawPhone = ctx.message.contact.phone_number;
    } else if (text) {
      rawPhone = text;
    }

    const normalized = normalizePhone(rawPhone);
    if (!normalized || !isValidUzPhone(normalized)) {
      await ctx.reply(
        '⚠️ Noto‘g‘ri telefon raqami! O‘zbekiston raqamini kiriting:\n<i>Masalan: +998 90 123 45 67 yoki 901234567</i>',
        { parse_mode: 'HTML' }
      );
      return true;
    }

    // Check if member already exists
    const existing = await findMemberByPhone(normalized);
    if (existing) {
      await ctx.reply(
        `⚠️ <b>Bu telefon raqamga ega mijoz allaqachon ro‘yxatdan o‘tgan!</b>\n\n` +
          `👤 <b>Ism:</b> ${existing.full_name}\n` +
          `📞 <b>Telefon:</b> ${formatPhone(existing.phone)}\n\n` +
          `Ushbu mijoz uchun to‘lov qilish yoki ma’lumotlarni ko‘rish uchun quyidagi tugmani bosing:`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '👤 Profilni ochish',
                  callback_data: `member_view_${existing.id}`
                }
              ],
              [
                {
                  text: '🔄 Yangi to‘lov / Obuna',
                  callback_data: `member_renew_${existing.id}`
                }
              ]
            ]
          }
        }
      );
      ctx.session = null;
      return true;
    }

    ctx.session.data.phone = normalized;
    ctx.session.step = 'MEMBERSHIP_TYPE';

    await ctx.reply(
      `📞 <b>Telefon:</b> ${formatPhone(normalized)}\n\n` +
        '3/7. <b>Obuna turini</b> tanlang:',
      {
        parse_mode: 'HTML',
        reply_markup: membershipTypeInlineKeyboard('reg').reply_markup
      }
    );
    return true;
  }

  // STEP 4: AMOUNT
  if (step === 'AMOUNT') {
    let amount = 0;
    if (text) {
      amount = Number(text.replace(/\D/g, ''));
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      await ctx.reply(
        '⚠️ Iltimos, to‘g‘ri to‘lov summasini so‘mda kiriting (faqat raqamlar):'
      );
      return true;
    }

    ctx.session.data.amount = amount;
    ctx.session.step = 'PAYMENT_METHOD';

    await ctx.reply(
      `💰 <b>To‘lov summasi:</b> ${formatUZS(amount)}\n\n` +
        '5/7. <b>To‘lov usulini</b> tanlang:',
      {
        parse_mode: 'HTML',
        reply_markup: paymentMethodInlineKeyboard('reg').reply_markup
      }
    );
    return true;
  }

  // STEP 6: START_DATE
  if (step === 'START_DATE') {
    const todayStr = getTodayDateString();
    let startDate = todayStr;

    if (text && text.toLowerCase() !== 'bugun') {
      // Validate format DD.MM.YYYY or YYYY-MM-DD
      const parts = text.split('.');
      if (parts.length === 3) {
        const [d, m, y] = parts;
        startDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      } else if (text.includes('-')) {
        startDate = text;
      }
    }

    ctx.session.data.startDate = startDate;
    ctx.session.step = 'NOTE';

    await ctx.reply(
      `📅 <b>Boshlanish sanasi:</b> ${formatDateUz(startDate)}\n\n` +
        '7/7. Qo‘shimcha <b>izoh</b> kiriting yoki o‘tkazib yuboring:',
      {
        parse_mode: 'HTML',
        reply_markup: skipOrCancelKeyboard().reply_markup
      }
    );
    return true;
  }

  // STEP 7: NOTE
  if (step === 'NOTE') {
    let note = null;
    if (text && text !== '⏭ O‘tkazib yuborish') {
      note = text;
    }

    ctx.session.data.note = note;
    ctx.session.step = 'CONFIRM';

    // Calculate dates
    const dates = calculateMembershipDates(
      ctx.session.data.membershipType,
      ctx.session.data.startDate
    );
    ctx.session.data.expirationDate = dates.expirationDate;

    // Build confirmation summary
    const summary =
      '📋 <b>MA’LUMOTLARNI TASDIQLASH</b>\n\n' +
      `👤 <b>Mijoz:</b> ${ctx.session.data.fullName}\n` +
      `📞 <b>Telefon:</b> ${formatPhone(ctx.session.data.phone)}\n` +
      `🏋️ <b>Obuna turi:</b> ${getMembershipTypeLabel(ctx.session.data.membershipType)}\n` +
      `💰 <b>To‘lov:</b> ${formatUZS(ctx.session.data.amount)}\n` +
      `💳 <b>To‘lov usuli:</b> ${getPaymentMethodLabel(ctx.session.data.paymentMethod)}\n` +
      `📅 <b>Boshlanish:</b> ${formatDateUz(ctx.session.data.startDate)}\n` +
      `⏳ <b>Tugash:</b> ${formatDateUz(ctx.session.data.expirationDate)}\n` +
      (note ? `📝 <b>Izoh:</b> ${note}\n` : '') +
      '\n<i>Barcha ma’lumotlar to‘g‘rimi?</i>';

    await ctx.reply(summary, {
      parse_mode: 'HTML',
      reply_markup: registrationConfirmInlineKeyboard('reg').reply_markup
    });
    return true;
  }

  return false;
};

export const handleRegistrationCallback = async (ctx) => {
  const data = ctx.callbackQuery?.data;
  if (!data || !data.startsWith('reg_')) return false;

  await ctx.answerCbQuery();

  if (data === 'reg_cancel') {
    ctx.session = null;
    await ctx.reply('❌ Ro‘yxatga olish bekor qilindi.', mainMenuKeyboard());
    return true;
  }

  // MEMBERSHIP TYPE SELECTION
  if (data.startsWith('reg_type_')) {
    const type = data.replace('reg_type_', '');
    const price = MEMBERSHIP_PRICES[type] || 0;

    if (!ctx.session) ctx.session = { wizard: 'registration', data: {} };
    ctx.session.data.membershipType = type;
    ctx.session.data.amount = price;
    ctx.session.step = 'AMOUNT';

    await ctx.reply(
      `🏋️ <b>Obuna turi:</b> ${getMembershipTypeLabel(type)}\n\n` +
        `4/7. To‘lov summasini kiriting yoki standart narxni tasdiqlang:\n` +
        `Standart narx: <b>${formatUZS(price)}</b>\n\n` +
        `<i>Agar standart narx bo‘lsa, <b>${price}</b> deb yozib yuboring yoki o‘zgartiring:</i>`,
      {
        parse_mode: 'HTML',
        reply_markup: Markup.keyboard([[String(price)], ['❌ Bekor qilish']]).resize().reply_markup
      }
    );
    return true;
  }

  // PAYMENT METHOD SELECTION
  if (data.startsWith('reg_pay_')) {
    const method = data.replace('reg_pay_', '');
    if (!ctx.session) ctx.session = { wizard: 'registration', data: {} };
    ctx.session.data.paymentMethod = method;
    ctx.session.step = 'START_DATE';

    const todayStr = getTodayDateString();
    await ctx.reply(
      `💳 <b>To‘lov usuli:</b> ${getPaymentMethodLabel(method)}\n\n` +
        '6/7. Obuna <b>boshlanish sanasini</b> kiriting:\n' +
        `<i>(Bugun uchun <b>bugun</b> deb yozing yoki DD.MM.YYYY shaklida kiriting)</i>`,
      {
        parse_mode: 'HTML',
        reply_markup: Markup.keyboard([['Bugun'], ['❌ Bekor qilish']]).resize().reply_markup
      }
    );
    return true;
  }

  // CONFIRMATION AND SAVE
  if (data === 'reg_confirm') {
    if (!ctx.session?.data) {
      await ctx.reply('⚠️ Sessiya topilmadi. Qaytadan urinib ko‘ring.', mainMenuKeyboard());
      return true;
    }

    const regData = ctx.session.data;
    const adminTelegramId = ctx.from.id;

    try {
      // 1. Create Member
      const { member } = await createMember({
        fullName: regData.fullName,
        phone: regData.phone,
        notes: regData.note
      });

      // 2. Create Membership
      const { membership } = await createOrRenewMembership({
        memberId: member.id,
        membershipType: regData.membershipType,
        paymentDate: regData.startDate,
        price: regData.amount
      });

      // 3. Record Payment
      await recordPayment({
        memberId: member.id,
        membershipId: membership.id,
        amount: regData.amount,
        paymentMethod: regData.paymentMethod,
        paymentDate: regData.startDate,
        registeredByTelegramId: adminTelegramId,
        notes: regData.note
      });

      // 4. Send Confirmation Card
      const card = createPaymentConfirmationCard({
        fullName: member.full_name,
        phone: member.phone,
        membershipType: regData.membershipType,
        amount: regData.amount,
        startDate: membership.start_date,
        expirationDate: membership.expiration_date,
        paymentMethod: regData.paymentMethod,
        note: regData.note
      });

      ctx.session = null;

      await ctx.reply(card, {
        parse_mode: 'HTML',
        reply_markup: mainMenuKeyboard()
      });

      return true;
    } catch (err) {
      console.error('[Registration Error]', err);
      await ctx.reply(
        `❌ Xatolik yuz berdi: ${err.message || 'Mijozni saqlab bo‘lmadi.'}`,
        mainMenuKeyboard()
      );
      ctx.session = null;
      return true;
    }
  }

  return false;
};
