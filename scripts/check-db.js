import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const botToken = process.env.BOT_TOKEN;

console.log('Tekshirilmoqda...');
console.log('Supabase URL:', supabaseUrl);

async function testAll() {
  // 1. Test Telegram Bot Token
  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const tgData = await tgRes.json();
    if (tgData.ok) {
      console.log(`✅ Telegram Bot ulandi: @${tgData.result.username} (${tgData.result.first_name})`);
    } else {
      console.error(`❌ Telegram Token xatosi:`, tgData.description);
    }
  } catch (err) {
    console.error('Telegram ulanishda xato:', err.message);
  }

  // 2. Test Supabase Database
  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    const { data, error } = await supabase.from('members').select('id').limit(1);
    if (error) {
      if (error.code === '42P01') {
        console.log('⚠️ Diqqat: "members" jadvali hali yaratilmagan. database.sql ni Supabase SQL Editor-da ishga tushirish kerak!');
      } else {
        console.error('❌ Supabase xatosi:', error.message, error);
      }
    } else {
      console.log('✅ Supabase ma’lumotlar bazasi va "members" jadvali muvaffaqiyatli ulandi!');
    }
  } catch (err) {
    console.error('Supabase ulanishda xato:', err.message);
  }
}

testAll();
