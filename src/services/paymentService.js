import { supabase } from '../supabase.js';
import { PAYMENT_METHODS, MEMBERSHIP_TYPES } from '../constants.js';
import { getTodayDateString, getWeekRange, getMonthRange } from '../utils/dateUtils.js';

export const recordPayment = async ({
  memberId,
  membershipId = null,
  amount,
  paymentMethod = PAYMENT_METHODS.CASH,
  paymentDate = null,
  registeredByTelegramId = null,
  notes = null
}) => {
  try {
    const effectivePaymentDate = paymentDate || getTodayDateString();

    const { data, error } = await supabase
      .from('payments')
      .insert({
        member_id: memberId,
        membership_id: membershipId,
        amount: Number(amount),
        payment_method: paymentMethod,
        payment_date: effectivePaymentDate,
        registered_by_telegram_id: registeredByTelegramId ? Number(registeredByTelegramId) : null,
        notes: notes ? notes.trim() : null
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[PaymentService] recordPayment error:', err);
    throw err;
  }
};

export const getMemberPaymentHistory = async (memberId, limit = 10) => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        membership:memberships (membership_type, start_date, expiration_date)
      `)
      .eq('member_id', memberId)
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[PaymentService] getMemberPaymentHistory error:', err);
    return [];
  }
};

export const getPaymentsToday = async () => {
  try {
    const today = getTodayDateString();
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        member:members (id, full_name, phone),
        membership:memberships (membership_type)
      `)
      .eq('payment_date', today)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const totalSum = (data || []).reduce((acc, p) => acc + Number(p.amount || 0), 0);
    return { payments: data || [], totalSum };
  } catch (err) {
    console.error('[PaymentService] getPaymentsToday error:', err);
    return { payments: [], totalSum: 0 };
  }
};

export const getFinancialStatistics = async () => {
  try {
    const today = getTodayDateString();
    const { start: weekStart, end: weekEnd } = getWeekRange();
    const { start: monthStart, end: monthEnd } = getMonthRange();

    // 1. Total registered members
    const { count: totalMembers } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true });

    // 2. Active monthly memberships
    const { count: activeMonthly } = await supabase
      .from('memberships')
      .select('*', { count: 'exact', head: true })
      .eq('membership_type', MEMBERSHIP_TYPES.MONTHLY)
      .gte('expiration_date', today)
      .neq('status', 'cancelled');

    // 3. Active daily memberships (created or valid today)
    const { count: activeDaily } = await supabase
      .from('memberships')
      .select('*', { count: 'exact', head: true })
      .eq('membership_type', MEMBERSHIP_TYPES.DAILY)
      .eq('expiration_date', today)
      .neq('status', 'cancelled');

    // 4. Expired memberships
    const { count: expiredCount } = await supabase
      .from('memberships')
      .select('*', { count: 'exact', head: true })
      .lt('expiration_date', today)
      .neq('status', 'cancelled');

    // 5. Expiring within 3 days
    const future3Days = new Date();
    future3Days.setDate(future3Days.getDate() + 3);
    const future3DaysStr = future3Days.toISOString().split('T')[0];

    const { count: expiring3Days } = await supabase
      .from('memberships')
      .select('*', { count: 'exact', head: true })
      .gte('expiration_date', today)
      .lte('expiration_date', future3DaysStr)
      .neq('status', 'cancelled');

    // 6. Payments today
    const { data: todayPayments } = await supabase
      .from('payments')
      .select('amount, membership:memberships(membership_type)')
      .eq('payment_date', today);

    const incomeToday = (todayPayments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);

    // 7. Payments this week
    const { data: weekPayments } = await supabase
      .from('payments')
      .select('amount')
      .gte('payment_date', weekStart)
      .lte('payment_date', weekEnd);

    const incomeThisWeek = (weekPayments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);

    // 8. Payments this month
    const { data: monthPayments } = await supabase
      .from('payments')
      .select('amount, membership:memberships(membership_type)')
      .gte('payment_date', monthStart)
      .lte('payment_date', monthEnd);

    const incomeThisMonth = (monthPayments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);

    // 9. Membership sales breakdown (this month)
    let dailySalesCount = 0;
    let monthlySalesCount = 0;

    (monthPayments || []).forEach((p) => {
      const type = p.membership?.membership_type;
      if (type === MEMBERSHIP_TYPES.DAILY) {
        dailySalesCount++;
      } else if (type === MEMBERSHIP_TYPES.MONTHLY) {
        monthlySalesCount++;
      }
    });

    return {
      totalMembers: totalMembers || 0,
      activeMonthly: activeMonthly || 0,
      activeDaily: activeDaily || 0,
      expiredCount: expiredCount || 0,
      expiring3Days: expiring3Days || 0,
      incomeToday,
      incomeThisWeek,
      incomeThisMonth,
      dailySalesCount,
      monthlySalesCount
    };
  } catch (err) {
    console.error('[PaymentService] getFinancialStatistics error:', err);
    return {
      totalMembers: 0,
      activeMonthly: 0,
      activeDaily: 0,
      expiredCount: 0,
      expiring3Days: 0,
      incomeToday: 0,
      incomeThisWeek: 0,
      incomeThisMonth: 0,
      dailySalesCount: 0,
      monthlySalesCount: 0
    };
  }
};
