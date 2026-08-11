import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createNotification } from '@/services/notifications/createNotification';
import { sendOneSignalBroadcast } from '@/services/onesignal/sender';
import { authenticateRequest, AuthError } from '@/lib/auth/authenticate';
import webpush from 'web-push';

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const privateKey = process.env.VAPID_PRIVATE_KEY || '';

if (publicKey && privateKey) {
  try {
    webpush.setVapidDetails(
      'mailto:gradeupgradeup6@gmail.com',
      publicKey,
      privateKey
    );
  } catch (e) {
    console.error('[BroadcastUpdate] Webpush VAPID init error:', e);
  }
}

// Route pour envoyer la notification globale de mise à jour GradeUp (ADMIN uniquement)
export async function POST(request: NextRequest) {
  try {
    // Sécurité : seul un administrateur peut déclencher une diffusion globale
    authenticateRequest(request);

    const schools = await db.school.findMany({
      select: { id: true },
    });

    const title = "Mbote ! 🚀 Nouvelles fonctionnalités";
    const message = "Mbote Il'y a une nouvelle mise à jour de GradeUp. Profitez de l'interface modernisée, de la correction des sélecteurs de classe et des optimisations de connexion !";

    const createdNotifications: any[] = [];

    // 1. Créer les notifications dans la base pour toutes les écoles
    for (const school of schools) {
      const notif = await createNotification({
        schoolId: school.id,
        senderId: 'SYSTEM',
        targetRole: 'ALL',
        targetClassId: '',
        title,
        message,
        type: 'SYSTEM',
        priority: 'HIGH',
        metadata: {
          updateVersion: '0.2.1',
          feature: 'Global Update',
        },
      });
      createdNotifications.push(notif);
    }

    // 2. Envoyer un Web Push direct à TOUS les appareils abonnés (mobile/desktop fermés ou ouverts)
    let pushSentCount = 0;
    if (publicKey && privateKey) {
      const subscriptions = await db.pushSubscription.findMany();
      
      const pushPayload = JSON.stringify({
        title,
        body: message,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        data: { url: '/' },
      });

      const pushPromises = subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            pushPayload
          );
          pushSentCount++;
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          }
        }
      });

      await Promise.all(pushPromises);
    }

    // 3. Broadcast OneSignal à tous les appareils (mobile + web)
    await sendOneSignalBroadcast({
      title,
      message,
      url: '/',
      data: { updateVersion: '0.2.1' },
    });

    return NextResponse.json({
      success: true,
      message: 'Notification de mise à jour Mbote diffusée avec succès.',
      notificationsCreated: createdNotifications.length,
      pushSentCount,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[BROADCAST NOTIFICATION ERROR]', error);
    const msg = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET est un raccourci (mêmes droits qu'un POST) — l'authentification est exigée
export async function GET(request: NextRequest) {
  // Sécurité: lecture seule, n'autorise pas le déclenchement non authentifié
  return NextResponse.json(
    { error: 'Méthode non autorisée. Utilisez POST (ADMIN requis).' },
    { status: 405 }
  );
}
