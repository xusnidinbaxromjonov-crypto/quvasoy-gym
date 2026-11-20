console.log('Testing project imports...');

try {
  await import('../src/constants.js');
  await import('../src/config.js');
  await import('../src/supabase.js');
  await import('../src/utils/dateUtils.js');
  await import('../src/utils/formatters.js');
  await import('../src/utils/phoneValidator.js');
  await import('../src/keyboards/replyKeyboards.js');
  await import('../src/keyboards/inlineKeyboards.js');
  await import('../src/middleware/auth.js');
  await import('../src/middleware/session.js');
  await import('../src/services/adminService.js');
  await import('../src/services/memberService.js');
  await import('../src/services/membershipService.js');
  await import('../src/services/paymentService.js');
  await import('../src/services/notificationService.js');
  await import('../src/handlers/registrationWizard.js');
  await import('../src/handlers/paymentWizard.js');
  await import('../src/handlers/memberHandler.js');
  await import('../src/handlers/searchHandler.js');
  await import('../src/handlers/reportsHandler.js');
  await import('../src/handlers/statsHandler.js');
  await import('../src/handlers/adminHandler.js');
  await import('../src/handlers/menuHandler.js');
  await import('../src/bot.js');
  await import('../api/webhook.js');
  await import('../api/cron/check-expirations.js');
  console.log('✅ ALL MODULES IMPORTED AND SYNTACTICALLY VALID!');
} catch (err) {
  console.error('❌ Import failed:', err);
  process.exit(1);
}
