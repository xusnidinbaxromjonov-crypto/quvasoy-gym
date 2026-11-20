import dotenv from 'dotenv';
dotenv.config();

const botToken = process.env.BOT_TOKEN;

async function testTG() {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
    const data = await res.json();
    console.log('Webhook info:', data);
  } catch (e) {
    console.error('Fetch error:', e.message);
  }
}

testTG();
