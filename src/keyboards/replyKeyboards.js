import { Markup } from 'telegraf';

export const mainMenuKeyboard = () => {
  return Markup.keyboard([
    ['➕ Mijoz qo‘shish', '💳 To‘lov qilish / To‘lovni qayd etish'],
    ['👥 Mijozlar ro‘yxati', '🔍 Mijozni qidirish'],
    ['📅 Bugun to‘lov qilganlar'],
    ['⏳ Muddati tugayotgan obunalar', '❌ Muddati tugagan obunalar'],
    ['📊 Statistika', '⚙️ Admin sozlamalari']
  ]).resize();
};

export const contactRequestKeyboard = () => {
  return Markup.keyboard([
    [Markup.button.contactRequest('📞 Kontaktni yuborish')],
    ['❌ Bekor qilish']
  ]).resize();
};

export const cancelKeyboard = () => {
  return Markup.keyboard([['❌ Bekor qilish']]).resize();
};

export const skipOrCancelKeyboard = () => {
  return Markup.keyboard([['⏭ O‘tkazib yuborish'], ['❌ Bekor qilish']]).resize();
};

export const confirmationReplyKeyboard = () => {
  return Markup.keyboard([['✅ Tasdiqlash'], ['❌ Bekor qilish']]).resize();
};
