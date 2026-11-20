import dotenv from 'dotenv';
dotenv.config();

import { MEMBERSHIP_PRICES, TIMEZONE } from './constants.js';

const parseAdminIds = (envVal) => {
  if (!envVal) return [];
  return envVal
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .map((id) => Number(id))
    .filter((id) => !isNaN(id));
};

export const config = {
  botToken: process.env.BOT_TOKEN || '',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  adminTelegramIds: parseAdminIds(process.env.ADMIN_TELEGRAM_IDS),
  cronSecret: process.env.CRON_SECRET || 'quvasoy_gym_cron_secret',
  webhookUrl: process.env.WEBHOOK_URL || '',
  webhookSecretToken: process.env.WEBHOOK_SECRET_TOKEN || '',
  prices: MEMBERSHIP_PRICES,
  timezone: TIMEZONE
};

export const validateConfig = () => {
  const missing = [];
  if (!config.botToken) missing.push('BOT_TOKEN');
  if (!config.supabaseUrl) missing.push('SUPABASE_URL');
  if (!config.supabaseServiceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  
  if (missing.length > 0) {
    console.warn(`[Config Warning] Missing environment variables: ${missing.join(', ')}`);
  }
};
