import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Haversine formula — returns distance in meters between two GPS points
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const GEO_RADIUS_METERS = 300; // 300m tolerance around school
const CUTOFF_HOUR = 8; // Before 08h00 = PRESENT, after = RETARD

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, schoolId, latitude, longitude, justification } = body;

    if (!userId || !schoolId) {
      return NextResponse.json({ error: 'userId et schoolId requis' }, { status: 400 });
    }

    // Fetch user and school data
    const [user, school] = await Promise.all([
      db.user.findUnique({ where: { id: userId }, select: { id: true, role: true, schoolId: true } }),
      db.school.findUnique({ where: { id: schoolId }, select: { id: true, latitude: true, longitude: true } }),
    ]);

    if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    if (user.schoolId !== schoolId) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    if (!school) return NextResponse.json({ error: 'École introuvable' }, { status: 404 });

    // ─── Geolocation check ───
    let geoValid = true;
    let distanceMeters: number | null = null;

    if (school.latitude !== null && school.longitude !== null && latitude !== undefined && longitude !== undefined) {
      distanceMeters = haversineDistance(latitude, longitude, school.latitude, school.longitude);
      geoValid = distanceMeters <= GEO_RADIUS_METERS;
    }

    if (!geoValid) {
      return NextResponse.json(
        {
          error: 'Géolocalisation hors périmètre',
          distance: Math.round(distanceMeters!),
          radius: GEO_RADIUS_METERS,
          message: `Vous êtes à ${Math.round(distanceMeters!)}m de l'école. Maximum autorisé : ${GEO_RADIUS_METERS}m.`,
        },
        { status: 422 }
      );
    }

    // ─── Anti-fraud: one presence per day ───
    const now = new Date();
    // Normalize date to start of day (UTC midnight) for unique constraint
    const dateKey = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const existing = await db.presence.findUnique({
      where: { userId_date: { userId, date: dateKey } },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Présence déjà marquée', statut: existing.statut, heureArrivee: existing.heureArrivee },
        { status: 409 }
      );
    }

    // ─── Determine status ───
    const hour = now.getHours();
    const minute = now.getMinutes();
    let statut = 'PRESENT';
    if (hour > CUTOFF_HOUR || (hour === CUTOFF_HOUR && minute > 0)) {
      statut = 'RETARD';
    }

    // Override for teacher with justification
    if (user.role === 'TEACHER' && justification) {
      statut = 'JUSTIFIE';
    }

    // ─── Save presence ───
    const presence = await db.presence.create({
      data: {
        schoolId,
        userId,
        date: dateKey,
        heureArrivee: now,
        statut,
        justification: justification || null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
      },
    });

    // ─── Notify admin via notification ───
    await db.notification.create({
      data: {
        schoolId,
        userId: null,
        senderId: userId,
        title: 'Présence enregistrée',
        message: `Pointage ${statut} enregistré à ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
        type: statut === 'RETARD' ? 'WARNING' : 'INFO',
        targetRole: 'ADMIN',
      },
    });

    return NextResponse.json({
      success: true,
      presence,
      statut,
      message:
        statut === 'PRESENT'
          ? '✅ Présence marquée — À l\'heure !'
          : statut === 'RETARD'
          ? '⚠️ Présence marquée — En retard'
          : '📝 Présence avec justification enregistrée',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    console.error('[PRESENCE/MARQUER]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
