import { calculateMembershipDates, getDaysDifference, getTodayDateString } from '../src/utils/dateUtils.js';
import { normalizePhone, isValidUzPhone } from '../src/utils/phoneValidator.js';
import { formatUZS, formatPhone, createPaymentConfirmationCard } from '../src/utils/formatters.js';
import { MEMBERSHIP_TYPES } from '../src/constants.js';

let failed = 0;
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    failed++;
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

console.log('--- 1. Testing Phone Validation ---');
assert(normalizePhone('+998901234567') === '+998901234567', 'Normalize standard phone');
assert(normalizePhone('901234567') === '+998901234567', 'Normalize 9 digit phone');
assert(normalizePhone('998901234567') === '+998901234567', 'Normalize 12 digit phone');
assert(isValidUzPhone('+998901234567') === true, 'Valid 90 code');
assert(isValidUzPhone('+998771234567') === true, 'Valid 77 code');
assert(isValidUzPhone('1234567') === false, 'Invalid short phone');

console.log('\n--- 2. Testing Currency and Phone Formatting ---');
assert(formatUZS(150000).includes('150') && formatUZS(150000).includes('so‘m'), 'Format 150000 UZS');
assert(formatUZS(15000).includes('15') && formatUZS(15000).includes('so‘m'), 'Format 15000 UZS');
assert(formatPhone('+998901234567') === '+998 (90) 123-45-67', 'Format phone string');

console.log('\n--- 3. Testing Membership Dates Calculation ---');
// Daily
const dailyDates = calculateMembershipDates(MEMBERSHIP_TYPES.DAILY, '2026-11-20');
assert(dailyDates.startDate === '2026-11-20', 'Daily start date is payment date');
assert(dailyDates.expirationDate === '2026-11-20', 'Daily expiration date is same date');

// Monthly - New member
const monthlyNew = calculateMembershipDates(MEMBERSHIP_TYPES.MONTHLY, '2026-11-20', null);
assert(monthlyNew.startDate === '2026-11-20', 'Monthly new start date');
assert(monthlyNew.expirationDate === '2026-12-20', 'Monthly new expiration date is 1 month later');
assert(monthlyNew.isExtended === false, 'Not extended');

// Monthly - Active member renewing before expiration!
// Existing expiration is 2026-12-15, paying on 2026-11-20
const todayStr = getTodayDateString();
const futureExp = new Date();
futureExp.setDate(futureExp.getDate() + 10);
const futureExpStr = futureExp.toISOString().split('T')[0];

const monthlyRenewal = calculateMembershipDates(MEMBERSHIP_TYPES.MONTHLY, todayStr, futureExpStr);
assert(monthlyRenewal.isExtended === true, 'Renewing unexpired member extends existing expiration');

// Receipt Card Generation
const receipt = createPaymentConfirmationCard({
  fullName: 'Azizbek Karimov',
  phone: '+998901234567',
  membershipType: MEMBERSHIP_TYPES.MONTHLY,
  amount: 150000,
  startDate: '2026-11-20',
  expirationDate: '2026-12-20',
  paymentMethod: 'cash'
});
assert(receipt.includes('TO‘LOV TASDIQLANDI'), 'Receipt contains header');
assert(receipt.includes('Azizbek Karimov'), 'Receipt contains name');
assert(receipt.includes('150'), 'Receipt contains price');

console.log(`\n========================================`);
if (failed === 0) {
  console.log('🎉 ALL UNIT TESTS PASSED SUCCESSFULLY!');
} else {
  console.error(`💥 ${failed} tests failed.`);
  process.exit(1);
}
