import { db } from '@/lib/db';
import { createNotification } from './createNotification';
import { CreateNotificationInput } from './notificationTypes';
import { sendPushNotification } from './pushSender';

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

    if (notification.userId) {
      // Direct notification: send to this user only
      await sendPushNotification(notification.userId, pushPayload);
    } else {
      // Broadcast/Group notification: retrieve matching user IDs in school/class
      const whereClause: any = {
        schoolId: notification.schoolId,
        active: true,
      };

      if (notification.targetRole && notification.targetRole !== 'ALL') {
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

      // Send to all targets in parallel background tasks
      const pushPromises = targetedUsers.map((u) =>
        sendPushNotification(u.id, pushPayload)
      );
      await Promise.all(pushPromises);
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
      return '/conferences';
    case 'MESSAGE':
      return '/messages';
    case 'CARD':
      return '/admin-cards';
    default:
      return '/';
  }
}
