import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import { TIMEZONE, MEMBERSHIP_TYPES } from '../constants.js';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

export const nowTashkent = () => dayjs().tz(TIMEZONE);

export const getTodayDateString = () => nowTashkent().format('YYYY-MM-DD');

export const formatDateUz = (dateStr) => {
  if (!dateStr) return '-';
  return dayjs(dateStr).tz(TIMEZONE).format('DD.MM.YYYY');
};

export const formatDateTimeUz = (dateStr) => {
  if (!dateStr) return '-';
  return dayjs(dateStr).tz(TIMEZONE).format('DD.MM.YYYY HH:mm');
};

/**
 * Calculates start and expiration date for a membership.
 * - WEEKLY: +7 days
 * - MONTHLY: +1 month
 * - DAILY: same day (legacy)
 * If renewing an unexpired membership, extends from existing expiration date!
 */
export const calculateMembershipDates = (type, paymentDateStr, existingExpirationDateStr = null) => {
  const todayStr = getTodayDateString();
  const paymentDate = paymentDateStr ? dayjs.tz(paymentDateStr, TIMEZONE) : nowTashkent();
  const basePaymentDateStr = paymentDate.format('YYYY-MM-DD');

  const isWeekly = type === MEMBERSHIP_TYPES.WEEKLY;
  const isMonthly = type === MEMBERSHIP_TYPES.MONTHLY;

  // Check if member has an existing unexpired membership to extend from
  let isUnexpired = false;
  let existingExp = null;

  if (existingExpirationDateStr) {
    existingExp = dayjs.tz(existingExpirationDateStr, TIMEZONE);
    const today = dayjs.tz(todayStr, TIMEZONE);
    if (existingExp.isSame(today, 'day') || existingExp.isAfter(today, 'day')) {
      isUnexpired = true;
    }
  }

  // 1. Weekly Membership (7 days)
  if (isWeekly) {
    if (isUnexpired && existingExp) {
      const newExpiration = existingExp.add(7, 'day').format('YYYY-MM-DD');
      return {
        startDate: basePaymentDateStr,
        expirationDate: newExpiration,
        isExtended: true,
        previousExpiration: existingExpirationDateStr
      };
    } else {
      const newExpiration = paymentDate.add(7, 'day').format('YYYY-MM-DD');
      return {
        startDate: basePaymentDateStr,
        expirationDate: newExpiration,
        isExtended: false
      };
    }
  }

  // 2. Monthly Membership (1 month)
  if (isMonthly) {
    if (isUnexpired && existingExp) {
      const newExpiration = existingExp.add(1, 'month').format('YYYY-MM-DD');
      return {
        startDate: basePaymentDateStr,
        expirationDate: newExpiration,
        isExtended: true,
        previousExpiration: existingExpirationDateStr
      };
    } else {
      const newExpiration = paymentDate.add(1, 'month').format('YYYY-MM-DD');
      return {
        startDate: basePaymentDateStr,
        expirationDate: newExpiration,
        isExtended: false
      };
    }
  }

  // Fallback for daily or default
  return {
    startDate: basePaymentDateStr,
    expirationDate: basePaymentDateStr,
    isExtended: false
  };
};

/**
 * Calculates the difference in days between target date and today.
 * Positive = remaining days
 * 0 = today
 * Negative = expired days ago
 */
export const getDaysDifference = (targetDateStr) => {
  if (!targetDateStr) return -1;
  const today = dayjs.tz(getTodayDateString(), TIMEZONE).startOf('day');
  const target = dayjs.tz(targetDateStr, TIMEZONE).startOf('day');
  return target.diff(today, 'day');
};

export const getWeekRange = () => {
  const now = nowTashkent();
  const start = now.startOf('week').add(1, 'day').format('YYYY-MM-DD');
  const end = now.endOf('week').add(1, 'day').format('YYYY-MM-DD');
  return { start, end };
};

export const getMonthRange = () => {
  const now = nowTashkent();
  const start = now.startOf('month').format('YYYY-MM-DD');
  const end = now.endOf('month').format('YYYY-MM-DD');
  return { start, end };
};
