import { calculateMembershipDates, getDaysDifference, getTodayDateString } from '../src/utils/dateUtils.js';
import { normalizePhone, isValidUzPhone } from '../src/utils/phoneValidator.js';
import { formatUZS, formatPhone, createPaymentConfirmationCard, getStatusBadge } from '../src/utils/formatters.js';
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

console.log('\n--- 2. Testing Currency and Status Formatting ---');
assert(formatUZS(150000).includes('150') && formatUZS(150000).includes('so‘m'), 'Format 150000 UZS');
assert(formatPhone('+998901234567') === '+998 (90) 123-45-67', 'Format phone string');
assert(getStatusBadge('active', '2026-12-20').includes('+'), 'Active status shows (+) balance');
assert(getStatusBadge('expired', '2026-01-01').includes('0'), 'Expired status shows (0) balance');

console.log('\n--- 3. Testing Monthly Membership Calculation ---');
// Monthly (1 month)
const monthlyNew = calculateMembershipDates(MEMBERSHIP_TYPES.MONTHLY, '2026-11-20', null);
assert(monthlyNew.startDate === '2026-11-20', 'Monthly new start date');
assert(monthlyNew.expirationDate === '2026-12-20', 'Monthly new expiration date is 1 month later');
assert(monthlyNew.isExtended === false, 'Not extended');

// Extension logic test: extending from existing expiration (+1 month)
const todayStr = getTodayDateString();
const futureExp = new Date();
futureExp.setDate(futureExp.getDate() + 10);
const futureExpStr = futureExp.toISOString().split('T')[0];

const monthlyRenewal = calculateMembershipDates(MEMBERSHIP_TYPES.MONTHLY, todayStr, futureExpStr);
assert(monthlyRenewal.isExtended === true, 'Renewing unexpired member extends existing expiration');

console.log(`\n========================================`);
if (failed === 0) {
  console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
} else {
  console.error(`💥 ${failed} tests failed.`);
  process.exit(1);
}
