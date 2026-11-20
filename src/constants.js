export const MEMBERSHIP_TYPES = {
  MONTHLY: 'monthly'
};

export const MEMBERSHIP_PRICES = {
  [MEMBERSHIP_TYPES.MONTHLY]: 150000
};

export const MEMBERSHIP_STATUSES = {
  ACTIVE: 'active',
  EXPIRING: 'expiring',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled'
};

export const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  OTHER: 'other'
};

export const NOTIFICATION_TYPES = {
  BEFORE_3_DAYS: 'before_3_days',
  BEFORE_1_DAY: 'before_1_day',
  ON_EXPIRATION: 'on_expiration',
  EXPIRED: 'expired'
};

export const ADMIN_ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin'
};

export const TIMEZONE = 'Asia/Tashkent';
