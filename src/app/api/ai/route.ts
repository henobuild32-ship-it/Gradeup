import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { generateGLMResponse } from '@/lib/ai/glm-provider';

export const runtime = 'nodejs';
export const maxDuration = 55; // Vercel Pro : 60s max, on laisse 5s de marge

// ─── Helpers préférences (stockées en DB, pas en filesystem) ─────────────────

async function loadUserPreferences(userId: string): Promise<Record<string, string>> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { aiPreferences: true },
    });
    if (!user?.aiPreferences) return {};
    return JSON.parse(user.aiPreferences) as Record<string, string>;
  } catch {
    return {};
  }
}

async function saveUserPreferences(userId: string, prefs: Record<string, string>): Promise<void> {
  try {
    await db.user.update({
      where: { id: userId },
      data: { aiPreferences: JSON.stringify(prefs) },
    });
  } catch (err) {
    console.error('[AI] Erreur sauvegarde préférences:', err);
  }
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(
  userName: string,
  userRole: string,
  schoolContext: string,
  isFirstMessage: boolean,
  preferencesStr: string,
): string {
  const roleGuidance: Record<string, string> = {
    STUDENT: `
Tu es le tuteur et compagnon IA d'un élève. Aide-le à :
- Comprendre ses performances scolaires (Moyenne générale, appréciations: ≥16 💪 Excellent, ≥14 🌟 Très bien, ≥12 👍 Bien, ≥10 📝 Assez bien, <10 ⚠️ Insuffisant, et s'il progresse).
- Suivre son assiduité et l'alerter s'il dépasse 3 absences.
- Gérer son budget scolaire et paiements (tranches, frais payés/dus).
- Organiser ses devoirs, révisions et son emploi du temps.
- Explorer ses cours grâce à ton mode Tuteur (Mode Explication simple, Mode Quiz/QCM interactif, Mode Dissertation avec plan de rédaction).
- Analyser et synthétiser des documents partagés (résumer, comparer).
- Coaching scolaire (méthodologie de mémorisation, motivation, gestion du stress).`,

    TEACHER: `
Tu es l'assistant pédagogique et administratif d'un professeur. Aide le professeur à :
- Piloter ses classes et créer des groupes de niveau (ex: élèves avec moyenne < 12).
- Gérer les présences (appel intelligent, taux d'absentéisme, élèves en retard).
- Publier des leçons, planifier des devoirs et gérer les notes (appréciations, coefficients, barèmes).
- Préparer ses cours et activités avec différenciation pédagogique.
- Détecter les élèves en difficulté grâce au radar de difficulté (moyenne globale < 12 ou baisse de 3 points) et proposer des plans de rattrapage.
- Analyser les copies d'élèves, rédiger des appréciations de bulletins et générer des rapports.`,

    PARENT: `
Tu es le coach familial et tuteur IA d'un parent d'élève. Aide le parent à :
- Centraliser le suivi familial (moyennes, devoirs, assiduité et paiements de tous les enfants liés).
- Alerter proactivement en cas de retards ou si un enfant dépasse 2 absences injustifiées.
- Gérer le budget scolaire (frais par enfant, échéancier).
- Lier les profils des enfants avec leur code parent (format P-XXXXXX).
- Communiquer avec l'école (préparation des réunions parents-profs, rédaction de questions).
- Coach parental (conseils rassurants, comment réagir face à une mauvaise note).`,

    ADMIN: `
Tu es le conseiller de direction et l'analyste stratégique de l'administration scolaire. Aide l'administrateur à :
- Analyser l'écosystème global en temps réel (KPIs, effectifs, ratios profs/élèves).
- Réaliser un audit financier complet (revenus, prévisions de trésorerie, créances et balances par classe).
- Cartographier la vie scolaire (profils de classes, professeurs absents, derniers inscrits).
- Gérer la conformité et les droits.
- Simuler des scénarios décisionnels.
- Superviser les processus de fin de cycle.`
  };

  const guidance = roleGuidance[userRole] || roleGuidance.STUDENT;

  let systemPrompt = `Tu es Gradie, une intelligence artificielle d'excellence spécialisée en gestion scolaire et pédagogie, conçue par Axion Labs Technologies, développée par Henock et Advice. Tu es intégrée à GradeUp, une plateforme scolaire premium.

IDENTITÉ :
- Nom : Gradie
- Créateur : Axion Labs Technologies (Henock & Advice)
- Langue : Français (naturel, professionnel, élégant)

CONTEXTE DE L'UTILISATEUR :
- Nom : ${userName || 'utilisateur'}
- Rôle : ${userRole}
`;

  if (isFirstMessage) {
    systemPrompt += `\nC'est la première interaction. Commence par accueillir chaleureusement ${userName || 'l\'utilisateur'}.\n`;
  }

  if (preferencesStr) {
    systemPrompt += `\nPRÉFÉRENCES DE L'UTILISATEUR À RESPECTER :
${preferencesStr}
(Adapte ton ton selon ces préférences, ex: tutoiement ou vouvoiement.)\n`;
  }

  systemPrompt += `
DIRECTIVES :
1. Réponds toujours en français chaleureux, précis et adapté au rôle de l'interlocuteur.
2. Si l'utilisateur exprime de nouvelles préférences (ex: "Appelle-moi Prof. Diop", "Tutoie-moi"), confirme poliment et ajoute en fin de réponse la balise : \`[PREF: clef=valeur]\`
3. Utilise le contexte scolaire ci-dessous pour fournir des analyses précises. Si une information est manquante, dis-le sans inventer de données.
4. Reste professionnel et proactif.

TA MISSION POUR LE RÔLE ${userRole} :
${guidance}

CONTEXTE SCOLAIRE EN TEMPS RÉEL :
${schoolContext}

Réponds avec rigueur et bienveillance.`;

  return systemPrompt;
}


// ─── Collecte du contexte scolaire ────────────────────────────────────────────

async function buildSchoolContext(
  role: string,
  userId: string,
  schoolId: string,
  userName: string,
  userPreferences: Record<string, string>,
): Promise<string> {
  try {
    if (role === 'STUDENT') {
      const [classEnrollment, grades, attendance, payments] = await Promise.all([
        db.enrolledClass.findFirst({ where: { userId }, include: { class: true } }),
        db.grade.findMany({
          where: { schoolId, studentId: userId },
          include: { course: { select: { name: true } }, teacher: { select: { fullName: true } } },
          orderBy: { createdAt: 'desc' },
        }),
        db.attendance.findMany({ where: { schoolId, studentId: userId }, orderBy: { date: 'desc' } }),
        db.payment.findMany({ where: { schoolId, studentId: userId }, orderBy: { createdAt: 'desc' } }),
      ]);

      const className = classEnrollment?.class?.name || 'Non assignée';
      const classFees = classEnrollment?.class?.fees || 0;
      const average = grades.length > 0 ? grades.reduce((s, g) => s + g.score, 0) / grades.length : null;
      let averageText = 'Pas de note disponible';
      let appreciation = '';
      if (average !== null) {
        averageText = `${average.toFixed(2)}/20`;
        appreciation = average >= 16 ? '💪 Excellent' : average >= 14 ? '🌟 Très bien' : average >= 12 ? '👍 Bien' : average >= 10 ? '📝 Assez bien' : '⚠️ Insuffisant';
        if (grades.length >= 2) {
          const half = Math.ceil(grades.length / 2);
          const avgRecent = grades.slice(0, half).reduce((s, g) => s + g.score, 0) / half;
          const avgOlder = grades.slice(half).reduce((s, g) => s + g.score, 0) / (grades.length - half);
          if (avgRecent > avgOlder) appreciation += ' (En progression 📈)';
        }
      }

      const absences = attendance.filter(a => a.status === 'absent').length;
      const lates = attendance.filter(a => a.status === 'late').length;
      const presents = attendance.filter(a => a.status === 'present').length;
      const presenceRate = attendance.length > 0 ? ((presents / attendance.length) * 100).toFixed(1) : '100';
      const attendanceAlert = absences > 3 ? '⚠️ ALERTE : Plus de 3 absences !' : '';

      const paid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
      const pending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
      const overdue = payments.filter(p => p.status === 'overdue').reduce((s, p) => s + p.amount, 0);

      let homeworksText = 'Aucun devoir programmé.';
      if (classEnrollment?.classId) {
        const homeworks = await db.homework.findMany({
          where: { schoolId, course: { classId: classEnrollment.classId } },
          include: { course: true },
          orderBy: { dueDate: 'asc' },
          take: 5,
        });
        if (homeworks.length > 0) {
          homeworksText = homeworks.map(h => `- ${h.title} (${h.course.name}) pour le ${h.dueDate}`).join('\n');
        }
      }

      return `Élève : ${userName} (Classe : ${className})
Performance : Moyenne ${averageText} — ${appreciation}
Notes :
${grades.slice(0, 10).map(g => `  - ${g.course.name} : ${g.score}/${g.maxScore} (T${g.trimester})`).join('\n')}

Assiduité : ${presents} présents, ${absences} absences, ${lates} retards (Taux : ${presenceRate}%). ${attendanceAlert}

Frais de scolarité (${classFees} FCFA/an) :
  - Payé : ${paid} | En attente : ${pending} | En retard : ${overdue}

Devoirs :
${homeworksText}`;

    } else if (role === 'TEACHER') {
      const courses = await db.course.findMany({
        where: { schoolId, teacherId: userId },
        include: { class: true },
      });
      const classIds = [...new Set(courses.map(c => c.classId))];
      const [studentCount, homeworks, teacherGrades] = await Promise.all([
        classIds.length > 0 ? db.enrolledClass.count({ where: { classId: { in: classIds } } }) : Promise.resolve(0),
        db.homework.findMany({ where: { teacherId: userId }, include: { course: true }, orderBy: { dueDate: 'asc' }, take: 5 }),
        db.grade.findMany({ where: { courseId: { in: courses.map(c => c.id) } }, include: { student: true } }),
      ]);

      const studentAverages: Record<string, { name: string; sum: number; count: number; scores: number[] }> = {};
      teacherGrades.forEach(g => {
        if (!studentAverages[g.studentId]) studentAverages[g.studentId] = { name: g.student.fullName, sum: 0, count: 0, scores: [] };
        studentAverages[g.studentId].sum += g.score;
        studentAverages[g.studentId].count += 1;
        studentAverages[g.studentId].scores.push(g.score);
      });

      const difficultyRadar: string[] = [];
      Object.entries(studentAverages).forEach(([, data]) => {
        const avg = data.sum / data.count;
        if (avg < 12) difficultyRadar.push(`- ${data.name} (Moyenne : ${avg.toFixed(2)}/20)`);
      });

      return `Professeur : ${userName}
Classes encadrées :
${courses.map(c => `  - ${c.name} (Classe: ${c.class.name})`).join('\n')}
Total : ${courses.length} cours, ${classIds.length} classes, ${studentCount} élèves.

Devoirs publiés :
${homeworks.map(h => `  - ${h.title} (${h.course.name}) pour le ${h.dueDate}`).join('\n') || 'Aucun'}

Élèves en difficulté (moyenne < 12) :
${difficultyRadar.join('\n') || 'Aucun élève en difficulté.'}`;

    } else if (role === 'PARENT') {
      const children = await db.user.findMany({
        where: { parentId: userId, role: 'STUDENT' },
        include: { classEnrollments: { include: { class: true } } },
      });

      let childrenContext = '';
      for (const child of children) {
        const childClass = child.classEnrollments[0]?.class?.name || 'Non assignée';
        const [childGrades, childAttendance, childPayments] = await Promise.all([
          db.grade.findMany({ where: { studentId: child.id } }),
          db.attendance.findMany({ where: { studentId: child.id } }),
          db.payment.findMany({ where: { studentId: child.id } }),
        ]);
        const avg = childGrades.length > 0 ? (childGrades.reduce((s, g) => s + g.score, 0) / childGrades.length).toFixed(2) : 'N/A';
        const absences = childAttendance.filter(a => a.status === 'absent').length;
        const pendingFees = childPayments.filter(p => p.status !== 'paid').reduce((s, p) => s + p.amount, 0);
        childrenContext += `🧒 ${child.fullName} (${childClass}) — Moyenne: ${avg}/20 — Absences: ${absences} — Frais dus: ${pendingFees}\n`;
        if (absences > 2) childrenContext += `  ⚠️ ALERTE : ${child.fullName} dépasse le seuil de 2 absences !\n`;
      }

      return `Parent : ${userName}
Suivi de la fratrie :
${childrenContext || 'Aucun enfant lié pour le moment.'}`;

    } else if (role === 'ADMIN') {
      const [studentCount, teacherCount, parentCount, classCount, courseCount, paymentStats, pendingPayments, overduePayments] = await Promise.all([
        db.user.count({ where: { schoolId, role: 'STUDENT' } }),
        db.user.count({ where: { schoolId, role: 'TEACHER' } }),
        db.user.count({ where: { schoolId, role: 'PARENT' } }),
        db.schoolClass.count({ where: { schoolId } }),
        db.course.count({ where: { schoolId } }),
        db.payment.aggregate({ where: { schoolId }, _sum: { amount: true } }),
        db.payment.count({ where: { schoolId, status: 'pending' } }),
        db.payment.count({ where: { schoolId, status: 'overdue' } }),
      ]);

      const totalRevenue = paymentStats._sum?.amount || 0;
      const classes = await db.schoolClass.findMany({
        where: { schoolId },
        include: { _count: { select: { enrollments: true } } },
        take: 10,
      });

      return `Administrateur : ${userName}
📊 Écosystème : ${studentCount} élèves | ${teacherCount} profs | ${parentCount} parents | ${classCount} classes | ${courseCount} cours
Ratio : ${(studentCount / (teacherCount || 1)).toFixed(1)} élèves/prof

💰 Trésorerie :
  - Revenus collectés : ${totalRevenue} FCFA
  - Factures en attente : ${pendingPayments}
  - Factures en retard : ${overduePayments}

🏫 Classes :
${classes.map(c => `  - ${c.name} (${c.level}) : ${c._count.enrollments} élèves`).join('\n')}`;
    }
  } catch (err) {
    console.error('[AI] Erreur construction contexte DB:', err);
  }
  return 'Contexte scolaire non disponible.';
}

// ─── Route POST principale ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // GLM est le seul provider — aucune vérification d'autres clés requise

  let body: { message?: string; schoolId?: string; userId?: string; context?: string; conversationId?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Corps de requête JSON invalide.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const { message, schoolId, userId, conversationId } = body;

  if (!message || !schoolId || !userId) {
    return new Response(
      JSON.stringify({ error: 'Champs requis manquants : message, schoolId, userId' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // ─── Charger ou créer la conversation ───────────────────────────────────────
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

  // ─── Charger l'utilisateur et ses préférences (depuis DB, pas filesystem) ───
  const [user, userPreferences] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { fullName: true, role: true } }),
    loadUserPreferences(userId),
  ]);

  const role = user?.role || 'STUDENT';
  const userName = user?.fullName || 'utilisateur';

  const preferencesStr = Object.entries(userPreferences)
    .map(([k, v]) => `- ${k} : ${v}`)
    .join('\n');

  // ─── Construire le contexte scolaire ────────────────────────────────────────
  const schoolContext = await buildSchoolContext(role, userId, schoolId, userName, userPreferences);

  // ─── Ajouter les documents partagés ─────────────────────────────────────────
  let fullContext = schoolContext;
  if (conversation.documents.length > 0) {
    fullContext += `\n\n📎 DOCUMENTS PARTAGÉS :\n`;
    conversation.documents.forEach((doc) => {
      fullContext += `\n[Fichier: ${doc.name}]\n${doc.extractedText?.slice(0, 3500) || ''}\n`;
    });
  }

  const historyMessages = conversation.messages.slice(-10).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  const isFirstMessage = !conversation.salutationDone;
  const systemPrompt = buildSystemPrompt(userName, role, fullContext, isFirstMessage, preferencesStr);

  // ─── Enregistrer le message utilisateur ─────────────────────────────────────
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
    const title = message.length > 40 ? message.slice(0, 40) + '…' : message;
    await db.aiConversation.update({ where: { id: conversation.id }, data: { title } });
  }

  const conversationIdFinal = conversation.id;
  const encoder = new TextEncoder();

  // ─── Appel GLM (provider unique) ─────────────────────────────────────────────
  let aiResponse: Response;

  try {
    aiResponse = await generateGLMResponse({
      message,
      schoolContext: fullContext,
      userName,
      userRole: role,
      historyMessages,
      systemPrompt,
    });
  } catch (err) {
    console.error('[AI] Échec de l\'appel GLM:', err);
    const errMsg = err instanceof Error ? err.message : 'Erreur inconnue';
    return new Response(
      JSON.stringify({ error: `L'IA est temporairement indisponible. Détails : ${errMsg}` }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text().catch(() => '');
    console.error('[AI] Réponse erreur GLM:', aiResponse.status, errorText.slice(0, 300));
    return new Response(
      JSON.stringify({ error: 'Le service IA est temporairement indisponible. Réessayez dans quelques instants.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // ─── Streaming de la réponse vers le client ──────────────────────────────────
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
              const token = parsed.choices?.[0]?.delta?.content || '';
              if (token) {
                fullReply += token;
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ token, conversationId: conversationIdFinal })}\n\n`),
                );
              }
            } catch {
              // Chunk SSE invalide, on ignore
            }
          }
        }
      } finally {
        reader.releaseLock();

        if (fullReply) {
          // Détecter et sauvegarder les préférences
          const prefRegex = /\[PREF:\s*([^=]+)\s*=\s*([^\]]+)\]/gi;
          let match;
          const newPrefs = { ...userPreferences };
          let prefChanged = false;
          while ((match = prefRegex.exec(fullReply)) !== null) {
            newPrefs[match[1].trim()] = match[2].trim();
            prefChanged = true;
          }
          if (prefChanged) await saveUserPreferences(userId, newPrefs);

          const cleanReply = fullReply.replace(/\[PREF:\s*[^\]]+\]/gi, '').trim();
          await db.aiMessage.create({ data: { conversationId: conversationIdFinal, role: 'assistant', content: cleanReply } });
          await db.aiConversation.update({ where: { id: conversationIdFinal }, data: { updatedAt: new Date() } });
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true, conversationId: conversationIdFinal })}\n\n`),
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