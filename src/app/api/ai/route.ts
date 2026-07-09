import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { generateLocalResponse } from '@/lib/ai/local-provider';
import { generateOpenRouterResponse } from '@/lib/ai/openrouter-provider';

const AI_PROVIDER = (process.env.AI_PROVIDER || 'openrouter').toLowerCase();
const HAS_OPENROUTER_KEY = !!process.env.OR_API_KEY;

export const runtime = 'nodejs';

function buildSystemPrompt(
  userName: string,
  userRole: string,
  schoolContext: string,
  isFirstMessage: boolean,
): string {
  const greeting = isFirstMessage
    ? `Bonjour ${userName || 'utilisateur'} ! `
    : '';

  const roleGuidance: Record<string, string> = {
    STUDENT:
      "Tu es un assistant pédagogique bienveillant. Aide l'élève à comprendre ses notes, suivre ses absences, gérer ses paiements, et l'encourage dans sa scolarité. Tu peux expliquer les concepts scolaires, donner des conseils d'étude et motiver l'élève.",
    TEACHER:
      "Tu es un assistant pour professeurs. Aide-le à gérer ses cours, suivre ses élèves, publier des leçons, prendre les présences, et noter les évaluations. Tu peux aussi suggérer des activités pédagogiques et des méthodes d'enseignement.",
    PARENT:
      "Tu es un assistant pour parents. Donne des informations sur le suivi des enfants (notes, absences, paiements), aide à comprendre le code de parrainage, et facilite la communication avec l'école. Sois rassurant et clair.",
    ADMIN:
      "Tu es un assistant de direction pour administrateur scolaire. Tu peux fournir une vue d'ensemble complète de l'école (effectifs, finances, classes, inscriptions). Tu aides aussi à la gestion quotidienne : suivi des frais de scolarité, blocage/déblocage d'accès, création de classes, inscriptions. Tu parles comme un vrai conseiller de direction.",
  };

  const guidance = roleGuidance[userRole] || roleGuidance.STUDENT;

  return `${greeting}Tu es Gradie, une intelligence artificielle experte en gestion scolaire et pédagogique, créée par Axion Labs Technologies, développée par Henock et Advice. Tu es intégrée dans GradeUp, une plateforme de gestion scolaire moderne de premier plan.

IDENTITÉ :
- Ton nom est Gradie.
- Tu as été créée par Axion Labs Technologies.
- Tu es intégrée dans GradeUp.
- Tu parles français de façon naturelle et professionnelle.

TON RÔLE SPÉCIFIQUE :
${guidance}

RÈGLES DE CONDUITE :
1. Réponds TOUJOURS en français (sauf si l'utilisateur pose une question dans une autre langue).
2. Utilise le contexte scolaire ci-dessous pour personnaliser ta réponse. Si le contexte est vide, réponds de façon générale mais utile.
3. Ne répète PAS de formule de bienvenue ou salutation si l'utilisateur a déjà été salué dans cette session (isFirstMessage=false).
4. Utilise des émojis avec modération et pertinence (📚 pour les cours, 📊 pour les stats, 💰 pour paiements, ✅ pour validation, etc.).
5. Sois précis, bienveillant et professionnel. Ne donne jamais d'informations fausses — si tu ne sais pas, dis-le honnêtement.
6. Pour les demandes administratives complexes (paiements, blocages, inscriptions), guide l'utilisateur vers la section appropriée de l'interface.
7. Adapte ton langage à ton interlocuteur : simple et encourageant pour un élève, technique et complet pour un administrateur.
8. Quand l'administrateur te demande des actions ou des analyses, propose toujours des solutions concrètes avec des recommandations chiffrées.
9. Tu peux générer des rapports verbaux détaillés sur n'importe quel aspect de l'école.
10. N'utilise JAMAIS de salutation (Bonjour, etc.) si tu n'es pas en train de commencer la conversation.

Contexte scolaire actuel :
${schoolContext}

Réponds toujours de façon utile, claire, humaine et bienveillante.`;
}

export async function POST(request: NextRequest) {
  const useLocal = AI_PROVIDER === 'local';
  const useOpenRouter = AI_PROVIDER === 'openrouter' || (AI_PROVIDER === 'auto' && HAS_OPENROUTER_KEY);

  if (!useLocal && !useOpenRouter) {
    return new Response(
      JSON.stringify({ error: "Aucun fournisseur IA configuré." }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const body = await request.json();
  const { message, schoolId, userId, context, conversationId } = body;

  if (!message || !schoolId || !userId) {
    return new Response(
      JSON.stringify({ error: 'Champs requis manquants : message, schoolId, userId' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

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

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { fullName: true, role: true },
  });

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
      const late = attendance.filter((a) => a.status === 'late').length;
      schoolContext = `Présences : ${present} présents, ${absent} absents, ${late} retards sur ${attendance.length} enregistrements.\n`;
    } else if (context === 'payments') {
      const payments = await db.payment.findMany({ where: { schoolId, studentId: userId } });
      const paid = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
      const pending = payments.filter((p) => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
      schoolContext = `Paiements : ${paid} payés, ${pending} en attente.\n`;
    } else if (context === 'teacher') {
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
      const [
        studentCount,
        teacherCount,
        parentCount,
        classCount,
        courseCount,
        paymentStats,
        pendingUsers,
        pendingPayments,
        overduePayments,
        blockedStudents,
      ] = await Promise.all([
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
        db.payment.count({ where: { schoolId, status: 'pending' } }),
        db.payment.count({ where: { schoolId, status: 'overdue' } }),
        db.user.count({ where: { schoolId, role: 'STUDENT', active: false } }),
      ]);

      const totalRevenue = paymentStats._sum?.amount || 0;

      const classes = await db.schoolClass.findMany({
        where: { schoolId },
        include: {
          _count: { select: { enrollments: true, courses: true } },
        },
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
      schoolContext += `  - 🔒 Élèves bloqués (inactifs) : ${blockedStudents}\n`;

      schoolContext += `\n💰 STATUT DES PAIEMENTS :\n`;
      schoolContext += `  - En attente : ${pendingPayments}\n`;
      schoolContext += `  - En retard : ${overduePayments}\n`;

      if (classes.length > 0) {
        schoolContext += `\n📋 DÉTAIL DES CLASSES :\n`;
        classes.forEach((c) => {
          schoolContext += `  - ${c.name} (Niveau : ${c.level}) : ${c._count.enrollments} élèves, ${c._count.courses} cours\n`;
        });
      }

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
    } else if (context === 'tuition') {
      const students = await db.user.findMany({
        where: { schoolId, role: 'STUDENT' },
        include: {
          payments: { orderBy: { createdAt: 'desc' } },
          classEnrollments: { include: { class: true } },
        },
      });
      const totalStudents = students.length;
      const paidStudents = students.filter((s) =>
        s.payments.some((p) => p.status === 'paid'),
      ).length;
      const totalCollected = students.reduce(
        (sum, s) => sum + s.payments.filter((p) => p.status === 'paid').reduce((a, p) => a + p.amount, 0),
        0,
      );
      schoolContext = `Administrateur - Suivi des frais de scolarité :\n`;
      schoolContext += `  - Total élèves : ${totalStudents}\n`;
      schoolContext += `  - Ayant payé : ${paidStudents}\n`;
      schoolContext += `  - N'ayant pas payé : ${totalStudents - paidStudents}\n`;
      schoolContext += `  - Total collecté : ${totalCollected} FCFA\n\n`;
      schoolContext += `Liste des élèves :\n`;
      students.slice(0, 50).forEach((s) => {
        const lastPaid = s.payments.find((p) => p.status === 'paid');
        const status = lastPaid ? 'Payé' : 'Non payé';
        const cls = s.classEnrollments[0]?.class?.name || 'Non assignée';
        schoolContext += `  - ${s.fullName} (${cls}) : ${status}\n`;
      });
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

  if (conversation.documents.length > 0) {
    schoolContext += `\nDocuments partagés dans cette conversation :\n`;
    conversation.documents.forEach((doc) => {
      schoolContext += `\n[Document : ${doc.name}]\n${doc.extractedText?.slice(0, 3000) || ''}\n`;
    });
  }

  const historyMessages = conversation.messages.slice(-10).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  const isFirstMessage = !conversation.salutationDone;

  const systemPrompt = buildSystemPrompt(
    user?.fullName || 'utilisateur',
    user?.role || 'USER',
    schoolContext,
    isFirstMessage,
  );

  await db.aiMessage.create({
    data: { conversationId: conversation.id, role: 'user', content: message },
  });

  if (isFirstMessage) {
    await db.aiConversation.update({
      where: { id: conversation.id },
      data: { salutationDone: true },
    });
  }

  if (conversation.messages.length === 0) {
    const title = message.length > 50 ? message.slice(0, 50) + '…' : message;
    await db.aiConversation.update({
      where: { id: conversation.id },
      data: { title },
    });
  }

  const conversationIdFinal = conversation.id;
  const encoder = new TextEncoder();

  if (useLocal) {
    const reply = await generateLocalResponse({
      message,
      schoolContext,
      userName: user?.fullName || 'utilisateur',
      userRole: user?.role || 'USER',
      historyMessages,
    });

    await db.aiMessage.create({
      data: { conversationId: conversationIdFinal, role: 'assistant', content: reply },
    });
    await db.aiConversation.update({
      where: { id: conversationIdFinal },
      data: { updatedAt: new Date() },
    });

    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ token: reply, conversationId: conversationIdFinal })}\n\n`,
          ),
        );
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ done: true, conversationId: conversationIdFinal })}\n\n`,
          ),
        );
        controller.close();
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

  let aiResponse: Response;
  try {
    aiResponse = await generateOpenRouterResponse({
      message,
      schoolContext,
      userName: user?.fullName || 'utilisateur',
      userRole: user?.role || 'USER',
      historyMessages,
      systemPrompt,
    });
  } catch {
    return new Response(
      JSON.stringify({ error: 'Impossible de contacter le service IA.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    return new Response(
      JSON.stringify({
        error: 'Le service IA est temporairement indisponible.',
        details: errorText.slice(0, 200),
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }

  let fullReply = '';

  const stream = new ReadableStream({
    async start(controller) {
      const reader = aiResponse.body?.getReader();
      if (!reader) {
        controller.close();
        return;
      }

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
              const token =
                parsed.choices?.[0]?.delta?.content || '';
              if (token) {
                fullReply += token;
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ token, conversationId: conversationIdFinal })}\n\n`,
                  ),
                );
              }
            } catch {}
          }
        }
      } finally {
        reader.releaseLock();
        if (fullReply) {
          await db.aiMessage.create({
            data: { conversationId: conversationIdFinal, role: 'assistant', content: fullReply },
          });
          await db.aiConversation.update({
            where: { id: conversationIdFinal },
            data: { updatedAt: new Date() },
          });
        }
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ done: true, conversationId: conversationIdFinal })}\n\n`,
          ),
        );
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