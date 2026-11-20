import { bot } from '../src/bot.js';
import { config } from '../src/config.js';

export default async function handler(req, res) {
  // Allow only POST requests from Telegram
  if (req.method !== 'POST') {
    return res.status(200).json({ status: 'ok', message: 'Quvasoy Gym Webhook Endpoint' });
  }

  // Validate optional Telegram Webhook Secret Token
  if (config.webhookSecretToken) {
    const headerSecret = req.headers['x-telegram-bot-api-secret-token'];
    if (headerSecret !== config.webhookSecretToken) {
      console.warn('[Webhook Warning] Unauthorized webhook request with invalid secret token.');
      return res.status(403).json({ error: 'Unauthorized secret token' });
    }
  }

  try {
    let update = req.body;
    if (typeof update === 'string') {
      try {
        update = JSON.parse(update);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON body' });
      }
    }

    if (!update) {
      return res.status(400).json({ error: 'No body in request' });
    }

    // Process update directly via Telegram Bot API (without hijacking Serverless res)
    await bot.handleUpdate(update);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[Webhook Error] Error processing update:', err);
    // Always return 200 OK to Telegram so it does not retry failed updates indefinitely
    return res.status(200).json({ ok: false, error: err.message });
  }
}
