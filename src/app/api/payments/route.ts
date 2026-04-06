import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const studentId = searchParams.get('studentId');
    const status = searchParams.get('status');
    const month = searchParams.get('month');

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    const where: Record<string, unknown> = { schoolId };

    if (studentId) {
      where.studentId = studentId;
    }

    if (status) {
      where.status = status;
    }

    if (month) {
      where.month = month;
    }

    const payments = await db.payment.findMany({
      where,
      include: {
        student: {
          select: { id: true, fullName: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ payments });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { schoolId, studentId, amount, status, month, method } = body;

    if (!schoolId || !studentId || amount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: schoolId, studentId, amount' },
        { status: 400 }
      );
    }

    const payment = await db.payment.create({
      data: {
        schoolId,
        studentId,
        amount: parseFloat(amount),
        status: status || 'pending',
        month: month || '',
        method: method || 'cash',
      },
      include: {
        student: {
          select: { id: true, fullName: true, role: true },
        },
      },
    });

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
