import { bot } from '../../src/bot.js';
import { config } from '../../src/config.js';
import { checkAndSendExpirationNotifications } from '../../src/services/notificationService.js';

export default async function handler(req, res) {
  // Allow GET or POST for Vercel Cron
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Security check: Verify Cron Secret if set
  const authHeader = req.headers.authorization;
  const cronSecretParam = req.query?.secret;

  const isAuthorized =
    !config.cronSecret ||
    authHeader === `Bearer ${config.cronSecret}` ||
    cronSecretParam === config.cronSecret;

  if (!isAuthorized) {
    console.warn('[Cron Warning] Unauthorized request to check-expirations.');
    return res.status(401).json({ error: 'Unauthorized cron request' });
  }

  try {
    console.log('[Cron] Running daily expiration check...');
    const result = await checkAndSendExpirationNotifications(bot);
    console.log(`[Cron] Completed. Sent: ${result.count} notifications.`);

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      result
    });
  } catch (err) {
    console.error('[Cron Error] Failure in check-expirations:', err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
