import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');

    if (!schoolId || schoolId === 'undefined' || schoolId === 'null') {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    const reportCards = await db.reportCard.findMany({
      where: { schoolId },
      include: {
        class: {
          select: { name: true }
        },
        student: {
          select: { fullName: true, photoUrl: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ reportCards });
  } catch (error) {
    console.error('Error fetching archive:', error);
    return NextResponse.json({ error: 'Failed to fetch archive' }, { status: 500 });
  }
}
