import { config } from '../config.js';
import { supabase } from '../supabase.js';

// In-memory cache for admin status (5 minute TTL) to minimize DB calls during high interaction
const adminCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

export const isUserAdmin = async (telegramId) => {
  if (!telegramId) return false;

  // 1. Check environment variable superadmins
  if (config.adminTelegramIds.includes(Number(telegramId))) {
    return true;
  }

  // 2. Check memory cache
  const cached = adminCache.get(telegramId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.isAdmin;
  }

  // 3. Check Supabase database
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('id, is_active')
      .eq('telegram_id', telegramId)
      .eq('is_active', true)
      .maybeSingle();

    const isAdmin = !error && !!data;
    adminCache.set(telegramId, { isAdmin, timestamp: Date.now() });
    return isAdmin;
  } catch (err) {
    console.error('[Auth Error] Error checking admin status:', err);
    return false;
  }
};

export const clearAdminCache = (telegramId = null) => {
  if (telegramId) {
    adminCache.delete(telegramId);
  } else {
    adminCache.clear();
  }
};

/**
 * Telegraf middleware to enforce admin access on every command, message, and callback.
 */
export const authMiddleware = async (ctx, next) => {
  const telegramId = ctx.from?.id;

  if (!telegramId) {
    return;
  }

  const authorized = await isUserAdmin(telegramId);

  if (!authorized) {
    const unauthorizedMessage =
      'Assalomu alaykum! Quvasoy Gym boshqaruv botiga xush kelibsiz. Bu bot faqat administratorlar uchun.';

    if (ctx.callbackQuery) {
      try {
        await ctx.answerCbQuery('Ruxsat berilmagan!', { show_alert: true });
      } catch (e) {
        // Ignore answerCbQuery error
      }
      return ctx.reply(unauthorizedMessage);
    }

    return ctx.reply(unauthorizedMessage);
  }

  return next();
};
