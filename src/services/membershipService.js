import { supabase } from '../supabase.js';
import { MEMBERSHIP_TYPES, MEMBERSHIP_STATUSES, MEMBERSHIP_PRICES } from '../constants.js';
import { calculateMembershipDates, getTodayDateString, getDaysDifference } from '../utils/dateUtils.js';

export const getLatestMembershipForMember = async (memberId) => {
  try {
    const { data, error } = await supabase
      .from('memberships')
      .select('*')
      .eq('member_id', memberId)
      .order('expiration_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[MembershipService] getLatestMembershipForMember error:', err);
    return null;
  }
};

/**
 * Creates or renews a membership.
 * If renewing an active monthly membership, extends from existing expiration date!
 */
export const createOrRenewMembership = async ({
  memberId,
  membershipType,
  paymentDate = null,
  manualExpirationDate = null,
  price = null
}) => {
  try {
    const today = getTodayDateString();
    const effectivePaymentDate = paymentDate || today;

    // Check latest existing membership to apply extension logic
    const latestMembership = await getLatestMembershipForMember(memberId);

    let startDate;
    let expirationDate;
    let isExtended = false;

    if (manualExpirationDate) {
      startDate = effectivePaymentDate;
      expirationDate = manualExpirationDate;
    } else {
      const dates = calculateMembershipDates(
        membershipType,
        effectivePaymentDate,
        latestMembership?.expiration_date
      );
      startDate = dates.startDate;
      expirationDate = dates.expirationDate;
      isExtended = !!dates.isExtended;
    }

    // Determine initial status based on expiration date
    const diff = getDaysDifference(expirationDate);
    let status = MEMBERSHIP_STATUSES.ACTIVE;
    if (diff < 0) {
      status = MEMBERSHIP_STATUSES.EXPIRED;
    } else if (diff <= 3) {
      status = MEMBERSHIP_STATUSES.EXPIRING;
    }

    const membershipPrice =
      price !== null && price !== undefined
        ? price
        : MEMBERSHIP_PRICES[membershipType] || 0;

    const { data: newMembership, error } = await supabase
      .from('memberships')
      .insert({
        member_id: memberId,
        membership_type: membershipType,
        start_date: startDate,
        expiration_date: expirationDate,
        status,
        price: membershipPrice
      })
      .select()
      .single();

    if (error) throw error;

    return {
      membership: newMembership,
      isExtended,
      previousExpiration: latestMembership?.expiration_date || null
    };
  } catch (err) {
    console.error('[MembershipService] createOrRenewMembership error:', err);
    throw err;
  }
};

/**
 * Manually adjusts the expiration date of an existing membership
 */
export const adjustExpirationDate = async (membershipId, newExpirationDate) => {
  try {
    const diff = getDaysDifference(newExpirationDate);
    let status = MEMBERSHIP_STATUSES.ACTIVE;
    if (diff < 0) {
      status = MEMBERSHIP_STATUSES.EXPIRED;
    } else if (diff <= 3) {
      status = MEMBERSHIP_STATUSES.EXPIRING;
    }

    const { data, error } = await supabase
      .from('memberships')
      .update({
        expiration_date: newExpirationDate,
        status
      })
      .eq('id', membershipId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[MembershipService] adjustExpirationDate error:', err);
    throw err;
  }
};

/**
 * Gets list of members whose membership is expiring in the next `days` days (e.g. 3 days)
 */
export const getExpiringMemberships = async (days = 3) => {
  try {
    const today = getTodayDateString();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('memberships')
      .select(`
        *,
        member:members (*)
      `)
      .gte('expiration_date', today)
      .lte('expiration_date', futureDateStr)
      .neq('status', MEMBERSHIP_STATUSES.CANCELLED)
      .order('expiration_date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[MembershipService] getExpiringMemberships error:', err);
    return [];
  }
};

/**
 * Gets list of expired memberships
 */
export const getExpiredMemberships = async (limit = 20) => {
  try {
    const today = getTodayDateString();

    const { data, error } = await supabase
      .from('memberships')
      .select(`
        *,
        member:members (*)
      `)
      .lt('expiration_date', today)
      .neq('status', MEMBERSHIP_STATUSES.CANCELLED)
      .order('expiration_date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[MembershipService] getExpiredMemberships error:', err);
    return [];
  }
};
