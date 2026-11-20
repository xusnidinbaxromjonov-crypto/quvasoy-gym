import { Markup } from 'telegraf';
import { MEMBERSHIP_TYPES, PAYMENT_METHODS } from '../constants.js';

export const membershipTypeInlineKeyboard = (actionPrefix = 'reg') => {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        '🏋️ Oylik obuna (150,000 so‘m / 1 oy)',
        `${actionPrefix}_type_${MEMBERSHIP_TYPES.MONTHLY}`
      )
    ],
    [
      Markup.button.callback(
        '⚡ Haftalik obuna (50,000 so‘m / 7 kun)',
        `${actionPrefix}_type_${MEMBERSHIP_TYPES.WEEKLY}`
      )
    ],
    [Markup.button.callback('❌ Bekor qilish', `${actionPrefix}_cancel`)]
  ]);
};

export const paymentMethodInlineKeyboard = (actionPrefix = 'reg') => {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('💵 Naqd pul', `${actionPrefix}_pay_${PAYMENT_METHODS.CASH}`),
      Markup.button.callback('💳 Plastik karta', `${actionPrefix}_pay_${PAYMENT_METHODS.CARD}`)
    ],
    [
      Markup.button.callback('🔄 Boshqa', `${actionPrefix}_pay_${PAYMENT_METHODS.OTHER}`)
    ],
    [Markup.button.callback('❌ Bekor qilish', `${actionPrefix}_cancel`)]
  ]);
};

export const registrationConfirmInlineKeyboard = (actionPrefix = 'reg') => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('✅ Tasdiqlash va saqlash', `${actionPrefix}_confirm`)],
    [Markup.button.callback('❌ Bekor qilish', `${actionPrefix}_cancel`)]
  ]);
};

export const memberProfileInlineKeyboard = (member) => {
  const isMemberActive = member.is_active;

  return Markup.inlineKeyboard([
    [
      Markup.button.callback('➕ Balans to‘ldirish / Obuna', `member_renew_${member.id}`)
    ],
    [
      Markup.button.callback('📜 To‘lovlar tarixi', `member_history_${member.id}`),
      Markup.button.callback('✏️ Tahrirlash', `member_edit_${member.id}`)
    ],
    [
      Markup.button.callback('📅 Muddatni o‘zgartirish', `member_adjustdate_${member.id}`),
      Markup.button.callback(
        isMemberActive ? '❌ Faolsizlantirish' : '✅ Faollashtirish',
        `member_toggleactive_${member.id}`
      )
    ],
    [Markup.button.callback('🔙 Asosiy menyu', 'nav_main_menu')]
  ]);
};

export const memberListPaginationKeyboard = (page, totalPages, filter = 'all') => {
  const navButtons = [];

  if (page > 1) {
    navButtons.push(Markup.button.callback('⬅️ Oldingi', `members_page_${page - 1}_${filter}`));
  }

  navButtons.push(Markup.button.callback(`📄 ${page}/${totalPages || 1}`, 'noop'));

  if (page < totalPages) {
    navButtons.push(Markup.button.callback('Keyingi ➡️', `members_page_${page + 1}_${filter}`));
  }

  return Markup.inlineKeyboard([
    navButtons,
    [
      Markup.button.callback(
        filter === 'all' ? '🔘 Barchasi' : '⚪ Barchasi',
        `members_filter_all`
      ),
      Markup.button.callback(
        filter === 'active_only' ? '🔘 Faqat faollar (+)' : '⚪ Faqat faollar (+)',
        `members_filter_active_only`
      )
    ],
    [Markup.button.callback('🔙 Asosiy menyu', 'nav_main_menu')]
  ]);
};

export const searchResultsKeyboard = (members = []) => {
  const buttons = members.slice(0, 8).map((m) => [
    Markup.button.callback(
      `👤 ${m.full_name} (${m.phone})`,
      `member_view_${m.id}`
    )
  ]);

  buttons.push([Markup.button.callback('🔙 Asosiy menyu', 'nav_main_menu')]);
  return Markup.inlineKeyboard(buttons);
};

export const adminSettingsKeyboard = () => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('👥 Administratorlar ro‘yxati', 'admin_list')],
    [Markup.button.callback('➕ Yangi admin qo‘shish', 'admin_add')],
    [Markup.button.callback('🔔 Bildirishnomalarni hozir yuborish', 'admin_trigger_notifs')],
    [Markup.button.callback('🔙 Asosiy menyu', 'nav_main_menu')]
  ]);
};
