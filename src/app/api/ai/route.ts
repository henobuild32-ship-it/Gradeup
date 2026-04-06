import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, schoolId, userId, context } = body;

    if (!message || !schoolId) {
      return NextResponse.json(
        { error: 'Missing required fields: message, schoolId' },
        { status: 400 }
      );
    }

    let schoolContext = '';

    if (context === 'grades' && userId) {
      const grades = await db.grade.findMany({
        where: { schoolId, studentId: userId },
        include: {
          course: { select: { name: true } },
          student: { select: { fullName: true } },
        },
        take: 20,
        orderBy: { createdAt: 'desc' },
      });

      const student = await db.user.findUnique({
        where: { id: userId },
        select: { fullName: true, role: true },
      });

      schoolContext = `Student: ${student?.fullName || 'Unknown'}\n`;
      schoolContext += `Grades:\n`;
      grades.forEach((g) => {
        schoolContext += `  - ${g.course.name}: ${g.score}/${g.maxScore} (Trimester ${g.trimester}) ${g.comment ? `Comment: ${g.comment}` : ''}\n`;
      });

      const avg = grades.length > 0
        ? (grades.reduce((sum, g) => sum + g.score, 0) / grades.length).toFixed(2)
        : 'N/A';
      schoolContext += `\nAverage: ${avg}\n`;
    } else if (context === 'attendance' && userId) {
      const attendance = await db.attendance.findMany({
        where: { schoolId, studentId: userId },
        take: 30,
        orderBy: { date: 'desc' },
      });

      const student = await db.user.findUnique({
        where: { id: userId },
        select: { fullName: true, role: true },
      });

      const present = attendance.filter((a) => a.status === 'present').length;
      const absent = attendance.filter((a) => a.status === 'absent').length;
      const late = attendance.filter((a) => a.status === 'late').length;

      schoolContext = `Student: ${student?.fullName || 'Unknown'}\n`;
      schoolContext += `Attendance Summary (last ${attendance.length} records):\n`;
      schoolContext += `  - Present: ${present}\n`;
      schoolContext += `  - Absent: ${absent}\n`;
      schoolContext += `  - Late: ${late}\n`;
      schoolContext += `  - Rate: ${attendance.length > 0 ? ((present / attendance.length) * 100).toFixed(1) : 'N/A'}%\n`;
    } else if (context === 'class-performance') {
      const classes = await db.schoolClass.findMany({
        where: { schoolId },
        include: {
          _count: { select: { enrollments: true } },
        },
      });

      const classGrades = await db.grade.findMany({
        where: { schoolId },
        include: {
          course: { select: { name: true, classId: true } },
          student: { select: { fullName: true } },
        },
        take: 50,
        orderBy: { createdAt: 'desc' },
      });

      schoolContext = `School Classes:\n`;
      classes.forEach((c) => {
        schoolContext += `  - ${c.name} (${c.level}): ${c._count.enrollments} students\n`;
      });
      schoolContext += `\nRecent Grades:\n`;
      classGrades.forEach((g) => {
        schoolContext += `  - ${g.student.fullName}: ${g.course.name}: ${g.score}/${g.maxScore}\n`;
      });
    } else if (context === 'payments' && userId) {
      const payments = await db.payment.findMany({
        where: { schoolId, studentId: userId },
        orderBy: { createdAt: 'desc' },
      });

      const student = await db.user.findUnique({
        where: { id: userId },
        select: { fullName: true },
      });

      const totalPaid = payments
        .filter((p) => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0);
      const totalPending = payments
        .filter((p) => p.status === 'pending')
        .reduce((sum, p) => sum + p.amount, 0);

      schoolContext = `Student: ${student?.fullName || 'Unknown'}\n`;
      schoolContext += `Payment Summary:\n`;
      schoolContext += `  - Total Paid: ${totalPaid}\n`;
      schoolContext += `  - Total Pending: ${totalPending}\n`;
      schoolContext += `  - Total Payments: ${payments.length}\n`;
    } else {
      const [studentCount, teacherCount, classCount] = await Promise.all([
        db.user.count({ where: { schoolId, role: 'STUDENT' } }),
        db.user.count({ where: { schoolId, role: 'TEACHER' } }),
        db.schoolClass.count({ where: { schoolId } }),
      ]);

      schoolContext = `School Overview:\n`;
      schoolContext += `  - Students: ${studentCount}\n`;
      schoolContext += `  - Teachers: ${teacherCount}\n`;
      schoolContext += `  - Classes: ${classCount}\n`;
    }

    const systemPrompt = `You are Gradie AI, an intelligent assistant for the GradeUp school management platform. You help administrators, teachers, students, and parents with school-related questions. You provide helpful, accurate, and supportive responses about grades, attendance, payments, and general school management. Always be encouraging and constructive.

Current school context:
${schoolContext}

Respond helpfully based on the school data provided above. If you don't have specific data to answer a question, provide general guidance.`;

    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const reply = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    return NextResponse.json({ reply });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
