import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createNotification } from '@/services/notifications/createNotification';

// Route pour envoyer la notification globale de mise à jour GradeUp
export async function POST(request: NextRequest) {
  try {
    const schools = await db.school.findMany({
      select: { id: true },
    });

    const title = "Mbote ! 🚀 Nouvelles fonctionnalités";
    const message = "Mbote Il'y a une nouvelle mise à jour de GradeUp. Profitez de l'interface modernisée, de la correction des sélecteurs de classe et des optimisations de connexion !";

    const createdNotifications: any[] = [];

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

    return NextResponse.json({
      success: true,
      message: 'Notification de mise à jour diffusée avec succès.',
      notificationsCreated: createdNotifications.length,
    });
  } catch (error: unknown) {
    console.error('[BROADCAST NOTIFICATION ERROR]', error);
    const msg = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET déclenche également la diffusion
export async function GET(request: NextRequest) {
  return POST(request);
}
