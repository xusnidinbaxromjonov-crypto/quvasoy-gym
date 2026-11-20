import { supabase } from '../supabase.js';
import { clearAdminCache } from '../middleware/auth.js';
import { ADMIN_ROLES } from '../constants.js';

export const getAdminsList = async () => {
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[AdminService] getAdminsList error:', err);
    return [];
  }
};

export const addAdmin = async ({ telegramId, fullName, role = ADMIN_ROLES.ADMIN }) => {
  try {
    const { data, error } = await supabase
      .from('admins')
      .upsert(
        {
          telegram_id: Number(telegramId),
          full_name: fullName,
          role,
          is_active: true
        },
        { onConflict: 'telegram_id' }
      )
      .select()
      .single();

    if (error) throw error;
    clearAdminCache(Number(telegramId));
    return { success: true, admin: data };
  } catch (err) {
    console.error('[AdminService] addAdmin error:', err);
    return { success: false, error: err.message };
  }
};

export const toggleAdminStatus = async (telegramId, isActive) => {
  try {
    const { data, error } = await supabase
      .from('admins')
      .update({ is_active: isActive })
      .eq('telegram_id', Number(telegramId))
      .select()
      .single();

    if (error) throw error;
    clearAdminCache(Number(telegramId));
    return { success: true, admin: data };
  } catch (err) {
    console.error('[AdminService] toggleAdminStatus error:', err);
    return { success: false, error: err.message };
  }
};
