import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!DEEPSEEK_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Clé API DeepSeek non configurée." }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const body = await request.json();
  const { message, schoolId, userId, context, conversationId } = body;

  if (!message || !schoolId || !userId) {
    return new Response(
      JSON.stringify({ error: 'Champs requis manquants : message, schoolId, userId' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ─── Récupération ou création de la conversation ──────────────────────────
  let conversation;
  if (conversationId) {
    conversation = await db.aiConversation.findFirst({
      where: { id: conversationId, userId },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 }, documents: true },
    });
  }
  if (!conversation) {
    conversation = await db.aiConversation.create({
      data: { userId, title: 'Nouvelle conversation', salutationDone: false },
      include: { messages: true, documents: true },
    });
  }

  // ─── Informations sur l'utilisateur ──────────────────────────────────────
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { fullName: true, role: true },
  });

  // ─── Contexte scolaire ────────────────────────────────────────────────────
  let schoolContext = '';
  try {
    if (context === 'grades') {
      const grades = await db.grade.findMany({
        where: { schoolId, studentId: userId },
        include: { course: { select: { name: true } } },
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
      const avg = grades.length > 0
        ? (grades.reduce((s, g) => s + g.score, 0) / grades.length).toFixed(2)
        : 'N/A';
      schoolContext = `Élève : ${user?.fullName}\nNotes :\n`;
      grades.forEach((g) => {
        schoolContext += `  - ${g.course.name} : ${g.score}/${g.maxScore} (T${g.trimester})\n`;
      });
      schoolContext += `Moyenne : ${avg}\n`;
    } else if (context === 'attendance') {
      const attendance = await db.attendance.findMany({
        where: { schoolId, studentId: userId },
        take: 30,
        orderBy: { date: 'desc' },
      });
      const present = attendance.filter((a) => a.status === 'present').length;
      const absent = attendance.filter((a) => a.status === 'absent').length;
      schoolContext = `Présences : ${present} présents, ${absent} absents sur ${attendance.length} enregistrements.\n`;
    } else if (context === 'payments') {
      const payments = await db.payment.findMany({ where: { schoolId, studentId: userId } });
      const paid = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
      const pending = payments.filter((p) => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
      schoolContext = `Paiements : ${paid} payés, ${pending} en attente.\n`;
    } else if (context === 'teacher') {
      // Contexte pour les professeurs : leurs cours et classes
      const courses = await db.course.findMany({
        where: { schoolId, teacherId: userId },
        include: { class: { select: { name: true, level: true } } },
      });
      const classIds = [...new Set(courses.map((c) => c.classId))];
      const studentCount = classIds.length > 0
        ? await db.enrolledClass.count({ where: { classId: { in: classIds } } })
        : 0;
      schoolContext = `Professeur : ${user?.fullName}\nCours enseignés :\n`;
      courses.forEach((c) => {
        schoolContext += `  - ${c.name} (Classe : ${c.class.name}, Niveau : ${c.class.level})\n`;
      });
      schoolContext += `\nTotal : ${courses.length} cours, ${classIds.length} classes, ${studentCount} élèves.\n`;
    } else if (context === 'admin') {
      // Contexte complet pour l'administrateur : vue d'ensemble de l'école
      const [studentCount, teacherCount, parentCount, classCount, courseCount, paymentStats, pendingUsers] = await Promise.all([
        db.user.count({ where: { schoolId, role: 'STUDENT' } }),
        db.user.count({ where: { schoolId, role: 'TEACHER' } }),
        db.user.count({ where: { schoolId, role: 'PARENT' } }),
        db.schoolClass.count({ where: { schoolId } }),
        db.course.count({ where: { schoolId } }),
        db.payment.aggregate({
          where: { schoolId },
          _sum: { amount: true },
        }),
        db.user.count({ where: { schoolId, active: false } }),
      ]);

      const totalRevenue = paymentStats._sum.amount || 0;

      // Récupérer les classes avec leurs effectifs
      const classes = await db.schoolClass.findMany({
        where: { schoolId },
        include: { _count: { select: { enrollments: true, courses: true } } },
      });

      schoolContext = `Administrateur : ${user?.fullName}\n`;
      schoolContext += `\n📊 VUE D'ENSEMBLE DE L'ÉCOLE :\n`;
      schoolContext += `  - 👨‍🎓 Élèves : ${studentCount}\n`;
      schoolContext += `  - 👨‍🏫 Professeurs : ${teacherCount}\n`;
      schoolContext += `  - 👪 Parents : ${parentCount}\n`;
      schoolContext += `  - 🏫 Classes : ${classCount}\n`;
      schoolContext += `  - 📚 Cours : ${courseCount}\n`;
      schoolContext += `  - 💰 Revenus totaux : ${totalRevenue} FCFA\n`;
      schoolContext += `  - ⏳ Utilisateurs en attente d'activation : ${pendingUsers}\n`;

      schoolContext += `\n📋 DÉTAIL DES CLASSES :\n`;
      classes.forEach((c) => {
        schoolContext += `  - ${c.name} (Niveau : ${c.level}) : ${c._count.enrollments} élèves, ${c._count.courses} cours\n`;
      });

      // Récupérer les paiements en attente
      const pendingPayments = await db.payment.count({
        where: { schoolId, status: 'pending' },
      });
      const overduePayments = await db.payment.count({
        where: { schoolId, status: 'overdue' },
      });
      schoolContext += `\n💰 STATUT DES PAIEMENTS :\n`;
      schoolContext += `  - En attente : ${pendingPayments}\n`;
      schoolContext += `  - En retard : ${overduePayments}\n`;

      // Récupérer les dernières inscriptions
      const recentStudents = await db.user.findMany({
        where: { schoolId, role: 'STUDENT' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { fullName: true, createdAt: true },
      });
      if (recentStudents.length > 0) {
        schoolContext += `\n🆕 DERNIERS ÉLÈVES INSCRITS :\n`;
        recentStudents.forEach((s) => {
          schoolContext += `  - ${s.fullName} (${new Date(s.createdAt).toLocaleDateString('fr-FR')})\n`;
        });
      }
    } else {
      const [studentCount, teacherCount, classCount] = await Promise.all([
        db.user.count({ where: { schoolId, role: 'STUDENT' } }),
        db.user.count({ where: { schoolId, role: 'TEACHER' } }),
        db.schoolClass.count({ where: { schoolId } }),
      ]);
      schoolContext = `École : ${studentCount} élèves, ${teacherCount} professeurs, ${classCount} classes.\n`;
    }
  } catch {
    schoolContext = '';
  }

  // ─── Contenu des documents attachés à la conversation ─────────────────────
  if (conversation.documents.length > 0) {
    schoolContext += `\nDocuments partagés dans cette conversation :\n`;
    conversation.documents.forEach((doc) => {
      schoolContext += `\n[Document : ${doc.name}]\n${doc.extractedText?.slice(0, 3000) || ''}\n`;
    });
  }

  // ─── Historique des messages de la conversation ────────────────────────────
  const historyMessages = conversation.messages.slice(-10).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  // ─── Prompt système ────────────────────────────────────────────────────────
  const isFirstMessage = !conversation.salutationDone;
  const greeting = isFirstMessage
    ? `Bonjour ${user?.fullName || 'utilisateur'} ! `
    : '';

  const systemPrompt = `${greeting}Tu es Gradie, une intelligence artificielle créée par Axions Labs, développée par Henock et Advice. Tu es intégrée dans GradeUp, une plateforme de gestion scolaire moderne.

Ton rôle est d'aider tous les utilisateurs de l'école : administrateurs, professeurs, élèves et parents. Tu réponds à TOUTES leurs questions — scolaires, organisationnelles, de conseil ou de soutien — de façon bienveillante, précise et professionnelle.

Tu parles principalement en français. Tu utilises le contexte scolaire fourni pour des réponses personnalisées. N'utilise JAMAIS une formule de bienvenue ou salutation si l'utilisateur a déjà été salué dans cette session.

Contexte scolaire actuel :
${schoolContext}

Réponds toujours de façon utile, claire, humaine et bienveillante.`;

  // Sauvegarder le message utilisateur
  await db.aiMessage.create({
    data: { conversationId: conversation.id, role: 'user', content: message },
  });

  // Marquer la salutation comme faite
  if (isFirstMessage) {
    await db.aiConversation.update({
      where: { id: conversation.id },
      data: { salutationDone: true },
    });
  }

  // Mettre à jour le titre de la conversation si c'est la première fois
  if (conversation.messages.length === 0) {
    const title = message.length > 50 ? message.slice(0, 50) + '…' : message;
    await db.aiConversation.update({
      where: { id: conversation.id },
      data: { title },
    });
  }

  // ─── Appel DeepSeek en streaming ──────────────────────────────────────────
  let deepseekResponse: Response;
  try {
    deepseekResponse = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        stream: true,
        temperature: 0.7,
        max_tokens: 1500,
        messages: [
          { role: 'system', content: systemPrompt },
          ...historyMessages,
          { role: 'user', content: message },
        ],
      }),
    });
  } catch {
    return new Response(
      JSON.stringify({ error: "Impossible de contacter le service IA." }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!deepseekResponse.ok) {
    return new Response(
      JSON.stringify({ error: "Le service IA est temporairement indisponible." }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ─── Stream SSE vers le client ─────────────────────────────────────────────
  const conversationIdFinal = conversation.id;
  const encoder = new TextEncoder();
  let fullReply = '';

  const stream = new ReadableStream({
    async start(controller) {
      const reader = deepseekResponse.body?.getReader();
      if (!reader) { controller.close(); return; }

      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter((l) => l.trim().startsWith('data:'));

          for (const line of lines) {
            const data = line.replace(/^data:\s*/, '').trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const token = parsed.choices?.[0]?.delta?.content || '';
              if (token) {
                fullReply += token;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token, conversationId: conversationIdFinal })}\n\n`));
              }
            } catch { /* token invalide, ignorer */ }
          }
        }
      } finally {
        reader.releaseLock();
        // Sauvegarder la réponse complète en base
        if (fullReply) {
          await db.aiMessage.create({
            data: { conversationId: conversationIdFinal, role: 'assistant', content: fullReply },
          });
          await db.aiConversation.update({
            where: { id: conversationIdFinal },
            data: { updatedAt: new Date() },
          });
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, conversationId: conversationIdFinal })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Conversation-Id': conversationIdFinal,
    },
  });
}
