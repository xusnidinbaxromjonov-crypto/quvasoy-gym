import { supabase } from '../supabase.js';

// Fallback in-memory storage if DB connection is not yet configured or fails
const inMemorySessions = new Map();

/**
 * Supabase-backed persistent session middleware for Telegraf.
 * Critical for Vercel Serverless Functions where in-memory state is wiped between invocations.
 */
export const sessionMiddleware = async (ctx, next) => {
  const userId = ctx.from?.id;
  if (!userId) {
    return next();
  }

  let sessionData = {};

  try {
    const { data, error } = await supabase
      .from('bot_sessions')
      .select('session_data')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data?.session_data) {
      sessionData = data.session_data;
    } else {
      // Check in-memory fallback
      sessionData = inMemorySessions.get(userId) || {};
    }
  } catch (err) {
    console.warn('[Session Middleware] Falling back to memory session:', err.message);
    sessionData = inMemorySessions.get(userId) || {};
  }

  // Attach session object to context
  ctx.session = sessionData;

  // Snapshot before executing handler to detect changes
  const snapshotBefore = JSON.stringify(sessionData);

  // Execute subsequent middlewares and handlers
  await next();

  // Snapshot after execution
  const snapshotAfter = JSON.stringify(ctx.session);

  // If session changed or was cleared, persist it
  if (snapshotBefore !== snapshotAfter) {
    inMemorySessions.set(userId, ctx.session);

    try {
      if (!ctx.session || Object.keys(ctx.session).length === 0) {
        // Clean up empty session
        await supabase.from('bot_sessions').delete().eq('id', userId);
      } else {
        await supabase.from('bot_sessions').upsert({
          id: userId,
          session_data: ctx.session,
          updated_at: new Date().toISOString()
        });
      }
    } catch (saveErr) {
      console.error('[Session Middleware] Failed to save session to Supabase:', saveErr.message);
    }
  }
};
