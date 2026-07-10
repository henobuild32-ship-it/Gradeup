import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('parentCode')?.trim().toUpperCase();

    if (!code) {
      return NextResponse.json({ valid: false });
    }

    const student = await db.user.findFirst({
      where: { parentCode: code, role: 'STUDENT' }
    });

    if (student) {
      return NextResponse.json({ valid: true, studentName: student.fullName });
    }

    return NextResponse.json({ valid: false });
  } catch (error) {
    return NextResponse.json({ valid: false, error: 'Database query error' }, { status: 500 });
  }
}
