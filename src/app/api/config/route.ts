import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const inviteCode = searchParams.get('inviteCode');

    // Lookup by invite code
    if (inviteCode) {
      const school = await db.school.findUnique({
        where: { inviteCode },
        select: {
          id: true,
          name: true,
          email: true,
          currency: true,
          inviteCode: true,
          logoUrl: true,
          province: true,
          city: true,
          commune: true,
          latitude: true,
          longitude: true,
          createdAt: true,
          subscriptionStatus: true,
          subscriptionExpiry: true,
        },
      });
      if (!school) {
        return NextResponse.json({ school: null });
      }
      return NextResponse.json({ school });
    }

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    const school = await db.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        email: true,
        currency: true,
        inviteCode: true,
        logoUrl: true,
        province: true,
        city: true,
        commune: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        subscriptionStatus: true,
        subscriptionExpiry: true,
      },
    });

    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    return NextResponse.json({ config: school });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { schoolId, currency, name, email, logoUrl, latitude, longitude } = body;

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    const existing = await db.school.findUnique({ where: { id: schoolId } });
    if (!existing) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    const school = await db.school.update({
      where: { id: schoolId },
      data: {
        ...(currency !== undefined && { currency }),
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(latitude !== undefined && { latitude: latitude === '' ? null : parseFloat(latitude) }),
        ...(longitude !== undefined && { longitude: longitude === '' ? null : parseFloat(longitude) }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        currency: true,
        logoUrl: true,
        latitude: true,
        longitude: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ config: school, school });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
