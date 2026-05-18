import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const DEEPSEEK_API_KEY = 'sk-69efd35f54a946a6a383231315eac1ea';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, schoolId, userId, context } = body;

    if (!message || !schoolId) {
      return NextResponse.json(
        { error: 'Champs requis manquants : message, schoolId' },
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

      schoolContext = `Étudiant : ${student?.fullName || 'Inconnu'}\n`;
      schoolContext += `Notes :\n`;
      grades.forEach((g) => {
        schoolContext += `  - ${g.course.name} : ${g.score}/${g.maxScore} (Trimestre ${g.trimester}) ${g.comment ? `Commentaire : ${g.comment}` : ''}\n`;
      });

      const avg = grades.length > 0
        ? (grades.reduce((sum, g) => sum + g.score, 0) / grades.length).toFixed(2)
        : 'N/A';
      schoolContext += `\nMoyenne générale : ${avg}\n`;

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

      schoolContext = `Étudiant : ${student?.fullName || 'Inconnu'}\n`;
      schoolContext += `Résumé présences (${attendance.length} derniers enregistrements) :\n`;
      schoolContext += `  - Présents : ${present}\n`;
      schoolContext += `  - Absents : ${absent}\n`;
      schoolContext += `  - Retards : ${late}\n`;
      schoolContext += `  - Taux de présence : ${attendance.length > 0 ? ((present / attendance.length) * 100).toFixed(1) : 'N/A'}%\n`;

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

      schoolContext = `Classes de l'école :\n`;
      classes.forEach((c) => {
        schoolContext += `  - ${c.name} (${c.level}) : ${c._count.enrollments} élèves\n`;
      });
      schoolContext += `\nNotes récentes :\n`;
      classGrades.forEach((g) => {
        schoolContext += `  - ${g.student.fullName} : ${g.course.name} : ${g.score}/${g.maxScore}\n`;
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

      schoolContext = `Étudiant : ${student?.fullName || 'Inconnu'}\n`;
      schoolContext += `Résumé paiements :\n`;
      schoolContext += `  - Total payé : ${totalPaid}\n`;
      schoolContext += `  - Total en attente : ${totalPending}\n`;
      schoolContext += `  - Nombre total de paiements : ${payments.length}\n`;

    } else {
      const [studentCount, teacherCount, classCount] = await Promise.all([
        db.user.count({ where: { schoolId, role: 'STUDENT' } }),
        db.user.count({ where: { schoolId, role: 'TEACHER' } }),
        db.schoolClass.count({ where: { schoolId } }),
      ]);

      schoolContext = `Vue d'ensemble de l'école :\n`;
      schoolContext += `  - Élèves : ${studentCount}\n`;
      schoolContext += `  - Professeurs : ${teacherCount}\n`;
      schoolContext += `  - Classes : ${classCount}\n`;
    }

    const systemPrompt = `Tu es Gradie, une intelligence artificielle créée par Axions Labs, développée par Henock et Advice. Tu es intégrée dans GradeUp, une plateforme de gestion scolaire moderne.

Ton rôle est d'aider tous les utilisateurs de l'école : les administrateurs, les professeurs, les élèves et les parents. Tu réponds à TOUTES leurs questions — scolaires, organisationnelles, de conseil ou de soutien — de façon bienveillante, précise et encourageante.

Si on te demande qui t'a créé, réponds que tu es Gradie, un produit d'Axions Labs, créé par Henock et Advice.

Tu parles principalement en français. Tu utilises le contexte scolaire fourni pour des réponses personnalisées, mais tu peux aussi répondre à des questions générales.

Contexte scolaire actuel :
${schoolContext}

Réponds toujours de façon utile, claire et bienveillante.`;

    // Appel à l'API DeepSeek
    const deepseekResponse = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: 0.7,
        max_tokens: 1500,
        stream: false,
      }),
    });

    if (!deepseekResponse.ok) {
      const errText = await deepseekResponse.text();
      console.error('DeepSeek API error:', errText);
      return NextResponse.json(
        { error: "Le service IA est temporairement indisponible. Réessayez dans un instant." },
        { status: 503 }
      );
    }

    const deepseekData = await deepseekResponse.json();
    const reply = deepseekData.choices?.[0]?.message?.content
      || "Désolé, je n'ai pas pu générer une réponse. Réessayez.";

    return NextResponse.json({ reply });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne du serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
