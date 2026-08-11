import { db } from '@/lib/db';
import { createNotification } from './createNotification';
import { CreateNotificationInput } from './notificationTypes';
import { sendPushNotification } from './pushSender';
import { sendOneSignalToUserIds } from '@/services/onesignal/sender';

/**
 * Notification Engine (Cœur du Système GradeUp)
 * Centralise la création de notifications dans PostgreSQL (Supabase Realtime)
 * et coordonne l'envoi automatique de notifications push Web (PWA) d'arrière-plan.
 */
export async function notifyUser(input: CreateNotificationInput) {
  try {
    // 1. Persist notification in DB (automatically triggers Supabase Realtime Insert)
    const notification = await createNotification(input);

    // 2. Dispatch PWA Web Push notification in the background
    const pushPayload = {
      title: notification.title,
      body: notification.message,
      url: getRouteForNotificationType(notification.type),
    };

    let targetUserIds: string[] = [];

    if (notification.userId) {
      // Direct notification: send to this user only
      targetUserIds = [notification.userId];
      await sendPushNotification(notification.userId, pushPayload);
    } else {
      // Broadcast/Group notification: retrieve matching user IDs in school/class
      const whereClause: any = {
        schoolId: notification.schoolId,
        active: true,
      };

      // 'CLASS' n'est pas un rôle utilisateur → on ne filtre que pour les vrais rôles
      if (notification.targetRole && notification.targetRole !== 'ALL' && notification.targetRole !== 'CLASS') {
        whereClause.role = notification.targetRole;
      }

      if (notification.targetClassId) {
        whereClause.classEnrollments = {
          some: { classId: notification.targetClassId },
        };
      }

      const targetedUsers = await db.user.findMany({
        where: whereClause,
        select: { id: true },
      });
      targetUserIds = targetedUsers.map((u) => u.id);

      // PWA: envois Web Push en parallèle
      const pushPromises = targetUserIds.map((id) =>
        sendPushNotification(id, pushPayload)
      );
      await Promise.all(pushPromises);
    }

    // 3. Push OneSignal (mobile + web) — non bloquant
    if (targetUserIds.length > 0) {
      try {
        await sendOneSignalToUserIds(targetUserIds, {
          title: notification.title,
          message: notification.message,
          url: getRouteForNotificationType(notification.type),
          data: { notificationId: notification.id, type: notification.type },
        });
      } catch (e) {
        console.warn('[NotificationEngine] OneSignal (non bloquant):', e);
      }
    }

    return notification;
  } catch (error) {
    console.error('[NotificationEngine] Erreur lors de la notification utilisateur:', error);
    throw error;
  }
}

/**
 * Resolves the relevant PWA redirection path depending on the event type
 */
function getRouteForNotificationType(type: string): string {
  switch (type) {
    case 'CONFERENCE':
      return '/meetings';
    case 'MESSAGE':
      return '/messages';
    case 'CARD':
      return '/admin-cards';
    case 'LESSON':
      return '/lessons';
    case 'HOMEWORK':
    case 'HOMEWORK_SUBMISSION':
      return '/homework';
    case 'GRADE':
      return '/grades';
    case 'ATTENDANCE':
      return '/attendance';
    case 'PAYMENT':
      return '/payments';
    case 'REPORT_CARD':
      return '/bulletins';
    default:
      return '/';
  }
}
