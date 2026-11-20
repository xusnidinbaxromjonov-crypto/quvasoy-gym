import { bot } from '../src/bot.js';
import { config } from '../src/config.js';

export default async function handler(req, res) {
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
    const update = req.body;
    if (!update) {
      return res.status(400).json({ error: 'No body in request' });
    }

    // Process Telegram update through Telegraf
    await bot.handleUpdate(update, res);

    // If Telegraf did not close the response, ensure 200 OK is returned
    if (!res.writableEnded) {
      res.status(200).json({ ok: true });
    }
  } catch (err) {
    console.error('[Webhook Error] Error processing update:', err);
    if (!res.writableEnded) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
