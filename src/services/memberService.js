import { supabase } from '../supabase.js';
import { normalizePhone } from '../utils/phoneValidator.js';
import { MEMBERSHIP_STATUSES } from '../constants.js';
import { getTodayDateString, getDaysDifference } from '../utils/dateUtils.js';

/**
 * Computes live status based on expiration date
 */
export const computeStatus = (expirationDate) => {
  if (!expirationDate) return MEMBERSHIP_STATUSES.EXPIRED;
  const diff = getDaysDifference(expirationDate);
  if (diff < 0) return MEMBERSHIP_STATUSES.EXPIRED;
  if (diff <= 3) return MEMBERSHIP_STATUSES.EXPIRING;
  return MEMBERSHIP_STATUSES.ACTIVE;
};

export const findMemberById = async (id) => {
  try {
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('id', id)
      .single();

    if (memberError || !member) return null;

    // Fetch latest membership
    const { data: memberships } = await supabase
      .from('memberships')
      .select('*')
      .eq('member_id', id)
      .order('expiration_date', { ascending: false })
      .limit(1);

    const latestMembership = memberships && memberships.length > 0 ? memberships[0] : null;

    // Fetch last payment
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('member_id', id)
      .order('payment_date', { ascending: false })
      .limit(1);

    const lastPayment = payments && payments.length > 0 ? payments[0] : null;

    // Compute dynamic status
    let liveStatus = MEMBERSHIP_STATUSES.EXPIRED;
    if (latestMembership) {
      liveStatus = computeStatus(latestMembership.expiration_date);
    }

    return {
      ...member,
      currentMembership: latestMembership
        ? {
            ...latestMembership,
            status: liveStatus
          }
        : null,
      lastPayment
    };
  } catch (err) {
    console.error('[MemberService] findMemberById error:', err);
    return null;
  }
};

export const findMemberByPhone = async (phone) => {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;

  try {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('phone', normalized)
      .maybeSingle();

    if (error || !data) return null;
    return await findMemberById(data.id);
  } catch (err) {
    console.error('[MemberService] findMemberByPhone error:', err);
    return null;
  }
};

export const searchMembers = async (query) => {
  if (!query || !query.trim()) return [];
  const cleanQuery = query.trim();

  try {
    let q = supabase.from('members').select('*');

    // Check if query is numeric (phone or telegram ID)
    const normalizedDigits = cleanQuery.replace(/\D/g, '');
    if (normalizedDigits.length >= 4) {
      q = q.or(`phone.ilike.%${normalizedDigits}%,full_name.ilike.%${cleanQuery}%`);
    } else {
      q = q.ilike('full_name', `%${cleanQuery}%`);
    }

    const { data, error } = await q.order('created_at', { ascending: false }).limit(15);
    if (error) throw error;

    // Attach latest membership for each found member
    const memberIds = (data || []).map((m) => m.id);
    if (memberIds.length === 0) return [];

    const { data: memberships } = await supabase
      .from('memberships')
      .select('*')
      .in('member_id', memberIds)
      .order('expiration_date', { ascending: false });

    const memberMap = new Map();
    (memberships || []).forEach((ms) => {
      if (!memberMap.has(ms.member_id)) {
        memberMap.set(ms.member_id, ms);
      }
    });

    return data.map((m) => {
      const ms = memberMap.get(m.id);
      return {
        ...m,
        currentMembership: ms ? { ...ms, status: computeStatus(ms.expiration_date) } : null
      };
    });
  } catch (err) {
    console.error('[MemberService] searchMembers error:', err);
    return [];
  }
};

export const getMembersList = async ({ page = 1, limit = 8, filter = 'all' } = {}) => {
  try {
    const offset = (page - 1) * limit;
    const today = getTodayDateString();

    // Fetch members count & basic data
    let query = supabase.from('members').select('*', { count: 'exact' });

    if (filter === 'active_only') {
      query = query.eq('is_active', true);
    }

    const { data: members, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    if (!members || members.length === 0) {
      return { members: [], total: 0, page, totalPages: 0 };
    }

    const memberIds = members.map((m) => m.id);
    const { data: memberships } = await supabase
      .from('memberships')
      .select('*')
      .in('member_id', memberIds)
      .order('expiration_date', { ascending: false });

    const membershipMap = new Map();
    (memberships || []).forEach((ms) => {
      if (!membershipMap.has(ms.member_id)) {
        membershipMap.set(ms.member_id, ms);
      }
    });

    const enrichedMembers = members.map((m) => {
      const ms = membershipMap.get(m.id);
      return {
        ...m,
        currentMembership: ms ? { ...ms, status: computeStatus(ms.expiration_date) } : null
      };
    });

    return {
      members: enrichedMembers,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit)
    };
  } catch (err) {
    console.error('[MemberService] getMembersList error:', err);
    return { members: [], total: 0, page, totalPages: 0 };
  }
};

export const createMember = async ({ fullName, phone, telegramId = null, notes = null }) => {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    throw new Error('Yaroqsiz telefon raqami!');
  }

  // Check if already exists
  const existing = await findMemberByPhone(normalizedPhone);
  if (existing) {
    return { member: existing, isExisting: true };
  }

  const { data, error } = await supabase
    .from('members')
    .insert({
      full_name: fullName.trim(),
      phone: normalizedPhone,
      telegram_id: telegramId ? Number(telegramId) : null,
      notes: notes ? notes.trim() : null,
      is_active: true
    })
    .select()
    .single();

  if (error) throw error;
  return { member: data, isExisting: false };
};

export const updateMember = async (id, fields) => {
  const updates = {};
  if (fields.fullName !== undefined) updates.full_name = fields.fullName.trim();
  if (fields.phone !== undefined) {
    const norm = normalizePhone(fields.phone);
    if (!norm) throw new Error('Telefon raqam noto‘g‘ri');
    updates.phone = norm;
  }
  if (fields.notes !== undefined) updates.notes = fields.notes ? fields.notes.trim() : null;
  if (fields.isActive !== undefined) updates.is_active = fields.isActive;

  const { data, error } = await supabase
    .from('members')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const toggleMemberActive = async (id, isActive) => {
  return updateMember(id, { isActive });
};
