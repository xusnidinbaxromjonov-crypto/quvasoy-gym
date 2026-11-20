import { supabase } from '../supabase.js';
import { NOTIFICATION_TYPES } from '../constants.js';
import { getTodayDateString, formatDateUz, nowTashkent } from '../utils/dateUtils.js';
import { formatPhone, getMembershipTypeLabel } from '../utils/formatters.js';
import { getAdminsList } from './adminService.js';
import { config } from '../config.js';

/**
 * Checks memberships and sends notifications to administrators for:
 * - 3 days before expiration
 * - 1 day before expiration
 * - On expiration date
 * - Expired memberships
 * Uses Supabase notifications table to guarantee deduplication and prevent spam!
 */
export const checkAndSendExpirationNotifications = async (botInstance = null) => {
  const today = getTodayDateString();
  const logs = [];

  try {
    // 1. Gather all active admins to receive notifications
    const dbAdmins = await getAdminsList();
    const activeAdminIds = new Set(config.adminTelegramIds);

    dbAdmins.forEach((a) => {
      if (a.is_active && a.telegram_id) {
        activeAdminIds.add(Number(a.telegram_id));
      }
    });

    const targetAdminIds = Array.from(activeAdminIds);
    if (targetAdminIds.length === 0) {
      return { success: false, message: 'Hech qanday administrator topilmadi.' };
    }

    // 2. Fetch all memberships that are not cancelled
    const { data: memberships, error } = await supabase
      .from('memberships')
      .select(`
        *,
        member:members (*)
      `)
      .neq('status', 'cancelled');

    if (error) throw error;
    if (!memberships || memberships.length === 0) {
      return { success: true, count: 0, message: 'Tekshirish uchun obunalar mavjud emas.' };
    }

    let notificationsSent = 0;

    for (const ms of memberships) {
      const expDateStr = ms.expiration_date;
      const member = ms.member;
      if (!member || !member.is_active) continue;

      const diff = Math.round(
        (new Date(expDateStr).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
      );

      let notifType = null;
      let headerText = '';

      if (diff === 3) {
        notifType = NOTIFICATION_TYPES.BEFORE_3_DAYS;
        headerText = '⏳ <b>OGOHLANTIRISH: Obuna tugashiga 3 kun qoldi!</b>';
      } else if (diff === 1) {
        notifType = NOTIFICATION_TYPES.BEFORE_1_DAY;
        headerText = '⚠️ <b>DIQQAT: Obuna tugashiga 1 kun qoldi!</b>';
      } else if (diff === 0) {
        notifType = NOTIFICATION_TYPES.ON_EXPIRATION;
        headerText = '🚨 <b>BUGUN TUGAYDI: Obuna muddati bugun tugaydi!</b>';
      } else if (diff < 0) {
        notifType = NOTIFICATION_TYPES.EXPIRED;
        headerText = `❌ <b>MUDDATI TUGADI: Obuna muddati o‘tgan (${Math.abs(diff)} kun avval)!</b>`;
      }

      if (!notifType) continue;

      // 3. Check if already notified for this membership, type, and target date
      const { data: existingNotif } = await supabase
        .from('notifications')
        .select('id')
        .eq('membership_id', ms.id)
        .eq('notification_type', notifType)
        .eq('target_date', expDateStr)
        .maybeSingle();

      if (existingNotif) {
        // Already sent, skip to prevent spam
        continue;
      }

      // 4. Construct notification message
      const message =
        `${headerText}\n\n` +
        `👤 <b>Mijoz:</b> ${member.full_name}\n` +
        `📞 <b>Telefon:</b> ${formatPhone(member.phone)}\n` +
        `🏋️ <b>Obuna turi:</b> ${getMembershipTypeLabel(ms.membership_type)}\n` +
        `⏳ <b>Tugash sanasi:</b> ${formatDateUz(expDateStr)}\n\n` +
        `💡 <i>Mijoz bilan bog‘lanib, obunani uzaytirishni tavsiya qiling.</i>`;

      const keyboard = {
        inline_keyboard: [
          [
            {
              text: '👤 Mijoz profilini ochish',
              callback_data: `member_view_${member.id}`
            }
          ],
          [
            {
              text: '🔄 Obunani yangilash',
              callback_data: `member_renew_${member.id}`
            }
          ]
        ]
      };

      // 5. Send to admins
      if (botInstance) {
        for (const adminId of targetAdminIds) {
          try {
            await botInstance.telegram.sendMessage(adminId, message, {
              parse_mode: 'HTML',
              reply_markup: keyboard
            });
          } catch (sendErr) {
            console.error(`[Notification] Failed to send to admin ${adminId}:`, sendErr.message);
          }
        }
      }

      // 6. Record notification in Supabase to prevent duplicate
      await supabase.from('notifications').insert({
        member_id: member.id,
        membership_id: ms.id,
        notification_type: notifType,
        target_date: expDateStr
      });

      notificationsSent++;
      logs.push(`Notified for member ${member.full_name} (${notifType})`);
    }

    return {
      success: true,
      count: notificationsSent,
      logs
    };
  } catch (err) {
    console.error('[NotificationService] checkAndSendExpirationNotifications error:', err);
    return { success: false, error: err.message };
  }
};
