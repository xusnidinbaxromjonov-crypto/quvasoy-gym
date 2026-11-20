import { MEMBERSHIP_TYPES, MEMBERSHIP_STATUSES, PAYMENT_METHODS } from '../constants.js';
import { formatDateUz, getDaysDifference } from './dateUtils.js';

export const formatUZS = (amount) => {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('uz-UZ').format(num) + ' so‘m';
};

export const formatPhone = (phone) => {
  if (!phone) return '-';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 12 && clean.startsWith('998')) {
    const code = clean.slice(3, 5);
    const p1 = clean.slice(5, 8);
    const p2 = clean.slice(8, 10);
    const p3 = clean.slice(10, 12);
    return `+998 (${code}) ${p1}-${p2}-${p3}`;
  }
  return phone;
};

export const getStatusBadge = (status, expirationDateStr = null) => {
  if (status === MEMBERSHIP_STATUSES.CANCELLED) {
    return '⚪ Bekor qilingan';
  }

  if (expirationDateStr) {
    const diff = getDaysDifference(expirationDateStr);
    if (diff < 0) {
      return `🔴 Balans: 0 (Tugagan, ${Math.abs(diff)} kun avval)`;
    } else if (diff === 0) {
      return '🟡 Balans: ⚠️ (Bugun tugaydi!)';
    } else if (diff <= 3) {
      return `🟡 Balans: + (Tugamoqda, ${diff} kun qoldi)`;
    } else {
      return `🟢 Balans: + (Faol, ${diff} kun qoldi)`;
    }
  }

  switch (status) {
    case MEMBERSHIP_STATUSES.ACTIVE:
      return '🟢 Balans: + (Faol)';
    case MEMBERSHIP_STATUSES.EXPIRING:
      return '🟡 Balans: + (Tugamoqda)';
    case MEMBERSHIP_STATUSES.EXPIRED:
      return '🔴 Balans: 0 (Tugagan)';
    default:
      return '🔴 Balans: 0 (Mavjud emas)';
  }
};

export const getMembershipTypeLabel = (type) => {
  return '🏋️ Oylik obuna (1 oy)';
};

export const getPaymentMethodLabel = (method) => {
  switch (method) {
    case PAYMENT_METHODS.CASH:
      return '💵 Naqd pul';
    case PAYMENT_METHODS.CARD:
      return '💳 Plastik karta';
    case PAYMENT_METHODS.OTHER:
      return '🔄 Boshqa';
    default:
      return method || '-';
  }
};

/**
 * Creates the formatted confirmation receipt text
 */
export const createPaymentConfirmationCard = ({
  fullName,
  phone,
  amount,
  startDate,
  expirationDate,
  status = MEMBERSHIP_STATUSES.ACTIVE,
  paymentMethod = PAYMENT_METHODS.CASH,
  note = null
}) => {
  const statusBadge = getStatusBadge(status, expirationDate);

  let text = `💳 <b>TO‘LOV QABUL QILINDI (+)</b>\n\n`;
  text += `👤 <b>Mijoz:</b> ${fullName}\n`;
  text += `📞 <b>Telefon:</b> ${formatPhone(phone)}\n`;
  text += `🏋️ <b>Obuna turi:</b> Oylik (1 oy)\n`;
  text += `💰 <b>To‘lov summasi:</b> ${formatUZS(amount)}\n`;
  text += `💳 <b>To‘lov usuli:</b> ${getPaymentMethodLabel(paymentMethod)}\n`;
  text += `📅 <b>Boshlanish:</b> ${formatDateUz(startDate)}\n`;
  text += `⏳ <b>Tugash:</b> ${formatDateUz(expirationDate)}\n`;
  text += `📌 <b>Holat:</b> ${statusBadge}\n`;

  if (note) {
    text += `📝 <b>Izoh:</b> ${note}\n`;
  }

  return text;
};
