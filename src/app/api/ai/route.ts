import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { generateLocalResponse } from '@/lib/ai/local-provider';
import { generateOpenRouterResponse } from '@/lib/ai/openrouter-provider';
import { promises as fs } from 'fs';
import { join } from 'path';

const AI_PROVIDER = (process.env.AI_PROVIDER || 'openrouter').toLowerCase();
const HAS_OPENROUTER_KEY = !!process.env.OR_API_KEY;

export const runtime = 'nodejs';

function buildSystemPrompt(
  userName: string,
  userRole: string,
  schoolContext: string,
  isFirstMessage: boolean,
  preferencesStr: string,
): string {
  const greeting = isFirstMessage
    ? `Bonjour ${userName || 'utilisateur'} ! `
    : '';

  const roleGuidance: Record<string, string> = {
    STUDENT: `
Tu es le tuteur et compagnon IA d'un élève. Aide-le à :
- Comprendre ses performances scolaires (Moyenne générale, appreciations: ≥16 💪 Excellent, ≥14 🌟 Très bien, ≥12 👍 Bien, ≥10 📝 Assez bien, <10 ⚠️ Insuffisant, et s'il progresse).
- Suivre son assiduité et l'alerter s'il dépasse 3 absences.
- Gérer son budget scolaire et paiements (tranches, frais payés/dus).
- Organiser ses devoirs, révisions et son emploi du temps.
- Explorer ses cours grâce à ton mode Tuteur (Mode Explication simple, Mode Quiz/QCM interactif, Mode Dissertation avec plan de rédaction).
- Analyser et synthétiser des documents partagés (résumer, comparer).
- Coaching scolaire (méthodologie de mémorisation, motivation, gestion du stress).`,

    TEACHER: `
Tu es l'assistant pédagogique et administratif d'un professeur. Tu hérites des capacités d'analyse de l'élève appliquées à tes cours. Aide le professeur à :
- Piloter ses classes et créer des groupes de niveau (ex: élèves avec moyenne < 12).
- Gérer les présences (appel intelligent, taux d'absentéisme, élèves en retard).
- Publier des leçons, planifier des devoirs et gérer les notes (appreciations, coefficients, barèmes).
- Préparer ses cours et activités avec différenciation pédagogique (simplification pour les élèves en difficulté).
- Détecter les élèves en difficulté grâce au radar de difficulté (moyenne globale < 12 ou baisse de 3 points) et proposer des plans de rattrapage.
- Analyser les copies d'élèves, rédiger des appréciations de bulletins (ex: élève brillant mais bavard) et générer des rapports.`,

    PARENT: `
Tu es le coach familial et tuteur IA d'un parent d'élève. Tu hérites des capacités d'analyse de l'élève pour le suivi des enfants. Aide le parent à :
- Centraliser le suivi familial (moyennes, devoirs, assiduité et paiements de tous les enfants liés).
- Alerter proactivement en cas de retards ou si un enfant dépasse 2 absences injustifiées.
- Gérer le budget scolaire (frais par enfant, échéancier).
- Lier les profils des enfants avec leur code parent (format P-XXXXXX).
- Communiquer avec l'école (préparation des réunions parents-profs, rédaction de questions).
- Coach parental (conseils rassurants, comment réagir face à une mauvaise note sans braquer l'enfant, expliquer le programme scolaire pour aider à la maison).`,

    ADMIN: `
Tu es le conseiller de direction et l'analyste stratégique de l'administration scolaire. Tu as les pleins pouvoirs de supervision (1-20+). Aide l'administrateur à :
- Analyser l'écosystème global en temps réel (KPIs, effectifs, ratios profs/élèves, classes de plus de 35 élèves).
- Réaliser un audit financier complet (revenus, prévisions de trésorerie, créances et balances par classe).
- Cartographier la vie scolaire (profils de classes, professeurs absents aujourd'hui, derniers élèves inscrits).
- Gérer la conformité et les droits (blocage/déblocage d'accès pour factures impayées, export de données GDPR, audit d'accès).
- Simuler des scénarios décisionnels (ex: impact d'une hausse de 5% des frais scolaires, optimisation des salles).
- Superviser les processus de fin de cycle (simulation de passage/redoublement pour moyenne < 10, validation par lot des bulletins).`
  };

  const guidance = roleGuidance[userRole] || roleGuidance.STUDENT;

  let systemPrompt = `Tu es Gradie, une intelligence artificielle d'excellence spécialisée en gestion scolaire et pédagogie, conçue par Axion Labs Technologies, et développée par Henock et Advice. Tu es intégrée à GradeUp, une plateforme scolaire premium de pointe.

IDENTITÉ :
- Nom : Gradie
- Créateur : Axion Labs Technologies (Henock & Advice)
- Langue : Français (naturel, professionnel, élégant)

CONTEXTE DE L'UTILISATEUR ET DE SES PRÉFÉRENCES :
- Nom de l'utilisateur : ${userName || 'utilisateur'}
- Rôle actuel : ${userRole}
`;

  if (preferencesStr) {
    systemPrompt += `\nPRÉFÉRENCES DE L'UTILISATEUR À RESPECTER ABSOLUMENT :
${preferencesStr}
(Note : Adapte ton ton, par exemple tutoiement ou vouvoiement, selon ces préférences.)\n`;
  }

  systemPrompt += `
CONDUITE ET DIRECTIVES :
1. Réponds toujours en français chaleureux, précis et adapté au rôle de l'interlocuteur.
2. Si l'utilisateur exprime de nouvelles préférences (ex: "Appelle-moi Prof. Diop", "Tutoie-moi"), confirme-le poliment et insère impérativement à la fin de ta réponse la balise exacte : \`[PREF: clef=valeur]\` (par exemple \`[PREF: name=Prof. Diop]\` ou \`[PREF: tone=tutoie]\`). Ne l'ajoute que si l'utilisateur demande explicitement un changement.
3. Utilise le contexte scolaire ci-dessous (provenant en temps réel de la base de données) pour fournir des analyses précises et chiffrées. Si une information n'est pas dans le contexte, dis-le poliment sans inventer de données.
4. Reste professionnel et proactif. Pour les demandes complexes d'actions administratives, explique comment procéder dans l'interface de GradeUp.

VOTRE MISSION POUR LE RÔLE ${userRole} :
${guidance}

CONTEXTE SCOLAIRE EN TEMPS RÉEL :
${schoolContext}

Réponds avec rigueur et bienveillance.`;

  return systemPrompt;
}

function checkRequiresCloud(message: string, hasDocuments: boolean): boolean {
  if (hasDocuments) return true;
  if (message.length > 120) return true;

  const complexKeywords = [
    'dissert', 'dissertation', 'qcm', 'quiz', 'rattrapage', 'recommandation',
    'strategique', 'simulation', 'analyse comparative', 'bulletin', 'corrige',
    'copie', 'cree un cours', 'genere', 'prepare un cours', 'soft skills',
    'soft-skills', 'tuteur', 'coaching', 'methode', 'stress', 'explication',
    'recherche', 'compare', 'synthese', 'difference', 'evolution'
  ];

  const lowerMsg = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return complexKeywords.some(keyword => lowerMsg.includes(keyword));
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

  // ─── Chargement des préférences utilisateur ───
  let preferencesStr = '';
  const prefPath = join(process.cwd(), 'public', 'uploads', `user_pref_${userId}.json`);
  let userPreferences: Record<string, string> = {};
  try {
    const data = await fs.readFile(prefPath, 'utf-8');
    userPreferences = JSON.parse(data);
    preferencesStr = Object.entries(userPreferences)
      .map(([k, v]) => `- ${k} : ${v}`)
      .join('\n');
  } catch {
    // Le fichier n'existe pas encore
  }

  let schoolContext = '';
  const role = user?.role || 'STUDENT';

  try {
    if (role === 'STUDENT') {
      // 1. Infos de classe
      const classEnrollment = await db.enrolledClass.findFirst({
        where: { userId },
        include: { class: true }
      });
      const className = classEnrollment?.class?.name || 'Non assignée';
      const classFees = classEnrollment?.class?.fees || 0;

      // 2. Notes
      const grades = await db.grade.findMany({
        where: { schoolId, studentId: userId },
        include: { course: { select: { name: true } }, teacher: { select: { fullName: true } } },
        orderBy: { createdAt: 'desc' },
      });

      const average = grades.length > 0 ? (grades.reduce((s, g) => s + g.score, 0) / grades.length) : null;
      let averageText = 'Pas de note disponible';
      let appreciation = 'Pas d\'appréciation';
      if (average !== null) {
        averageText = `${average.toFixed(2)}/20`;
        appreciation = average >= 16 ? '💪 Excellent' : average >= 14 ? '🌟 Très bien' : average >= 12 ? '👍 Bien' : average >= 10 ? '📝 Assez bien' : '⚠️ Insuffisant';
        
        // Calculer l'évolution si au moins 2 notes
        if (grades.length >= 2) {
          const half = Math.ceil(grades.length / 2);
          const recentGrades = grades.slice(0, half);
          const olderGrades = grades.slice(half);
          const avgRecent = recentGrades.reduce((s, g) => s + g.score, 0) / recentGrades.length;
          const avgOlder = olderGrades.reduce((s, g) => s + g.score, 0) / olderGrades.length;
          if (avgRecent > avgOlder) {
            appreciation += ' (En progression 📈)';
          }
        }
      }

      // 3. Présence
      const attendance = await db.attendance.findMany({
        where: { schoolId, studentId: userId },
        orderBy: { date: 'desc' },
      });
      const absences = attendance.filter(a => a.status === 'absent').length;
      const lates = attendance.filter(a => a.status === 'late').length;
      const presents = attendance.filter(a => a.status === 'present').length;
      const presenceRate = attendance.length > 0 ? ((presents / attendance.length) * 100).toFixed(1) : '100';

      const attendanceAlert = absences > 3 ? '⚠️ ALERTE CRITIQUE : Vous avez manqué plus de 3 cours ! Veuillez régulariser.' : '';

      // 4. Paiements
      const payments = await db.payment.findMany({
        where: { schoolId, studentId: userId },
        orderBy: { createdAt: 'desc' },
      });
      const paid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
      const pending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
      const overdue = payments.filter(p => p.status === 'overdue').reduce((s, p) => s + p.amount, 0);

      // 5. Devoirs
      let homeworksText = 'Aucun devoir programmé.';
      if (classEnrollment?.classId) {
        const homeworks = await db.homework.findMany({
          where: { schoolId, course: { classId: classEnrollment.classId } },
          include: { course: true },
          orderBy: { dueDate: 'asc' },
          take: 5
        });
        if (homeworks.length > 0) {
          homeworksText = homeworks.map(h => `- ${h.title} (${h.course.name}) pour le ${h.dueDate} : ${h.description}`).join('\n');
        }
      }

      // 6. Notifications
      const notifications = await db.notification.findMany({
        where: {
          schoolId,
          OR: [
            { userId },
            { targetRole: 'STUDENT' },
            { targetRole: 'ALL' },
            { targetClassId: classEnrollment?.classId || '' }
          ]
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });
      const notificationsText = notifications.map(n => `- [${n.priority}] ${n.message}`).join('\n');

      schoolContext = `Élève : ${user?.fullName} (Classe : ${className})
Performance : Moyenne de ${averageText} (${appreciation})
Notes :
${grades.map(g => `  - ${g.course.name} : ${g.score}/${g.maxScore} (T${g.trimester}, comment: ${g.comment || 'aucun'})`).join('\n')}

Assiduité : ${presents} présents, ${absences} absences, ${lates} retards (Taux : ${presenceRate}%). ${attendanceAlert}

Frais de scolarité (Scolarité annuelle : ${classFees} USD/FCFA) :
  - Payé : ${paid}
  - En attente : ${pending}
  - En retard : ${overdue}

Devoirs à faire :
${homeworksText}

Notifications récentes :
${notificationsText}
`;

    } else if (role === 'TEACHER') {
      // 1. Cours et classes
      const courses = await db.course.findMany({
        where: { schoolId, teacherId: userId },
        include: { class: true }
      });
      const classIds = [...new Set(courses.map(c => c.classId))];
      const studentCount = classIds.length > 0 
        ? await db.enrolledClass.count({ where: { classId: { in: classIds } } })
        : 0;

      // 2. Devoirs programmés
      const homeworks = await db.homework.findMany({
        where: { teacherId: userId },
        include: { course: true },
        orderBy: { dueDate: 'asc' },
        take: 5
      });

      // 3. Radar de difficulté (élèves < 12 ou baisse de 3 points)
      const teacherGrades = await db.grade.findMany({
        where: { courseId: { in: courses.map(c => c.id) } },
        include: { student: true, course: true }
      });

      const studentAverages: Record<string, { name: string; sum: number; count: number; scores: number[] }> = {};
      teacherGrades.forEach(g => {
        if (!studentAverages[g.studentId]) {
          studentAverages[g.studentId] = { name: g.student.fullName, sum: 0, count: 0, scores: [] };
        }
        studentAverages[g.studentId].sum += g.score;
        studentAverages[g.studentId].count += 1;
        studentAverages[g.studentId].scores.push(g.score);
      });

      const difficultyRadar: string[] = [];
      Object.entries(studentAverages).forEach(([id, data]) => {
        const avg = data.sum / data.count;
        if (avg < 12) {
          difficultyRadar.push(`- ${data.name} (Moyenne : ${avg.toFixed(2)}/20) - Niveau faible`);
        }
        if (data.scores.length >= 3) {
          const half = Math.ceil(data.scores.length / 2);
          const recent = data.scores.slice(0, half);
          const older = data.scores.slice(half);
          const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
          const avgOlder = older.reduce((a, b) => a + b, 0) / older.length;
          if (avgOlder - avgRecent >= 3) {
            difficultyRadar.push(`- ${data.name} (⚠️ Chute de moyenne : de ${avgOlder.toFixed(1)} à ${avgRecent.toFixed(1)})`);
          }
        }
      });

      // 4. Absences dans ses classes
      const attendance = await db.attendance.findMany({
        where: { teacherId: userId },
        include: { student: true },
        orderBy: { date: 'desc' },
        take: 10
      });

      schoolContext = `Professeur : ${user?.fullName}
Classes encadrées :
${courses.map(c => `  - ${c.name} (Classe: ${c.class.name}, Niveau: ${c.class.level})`).join('\n')}
Total : ${courses.length} cours, ${classIds.length} classes, ${studentCount} élèves.

Devoirs publiés :
${homeworks.map(h => `  - ${h.title} (${h.course.name}) pour le ${h.dueDate}`).join('\n')}

Radar d'élèves en difficulté ou baisse de notes :
${difficultyRadar.length > 0 ? difficultyRadar.join('\n') : 'Aucun élève en difficulté à signaler.'}

Historique d'appel récent :
${attendance.map(a => `  - ${a.student.fullName} : ${a.status === 'absent' ? 'Absent' : a.status === 'late' ? 'En retard' : 'Présent'} (${a.date}, motif: ${a.reason || 'aucun'})`).join('\n')}
`;

    } else if (role === 'PARENT') {
      // 1. Enfants liés
      const children = await db.user.findMany({
        where: { parentId: userId, role: 'STUDENT' },
        include: { classEnrollments: { include: { class: true } } }
      });

      let childrenContext = '';
      for (const child of children) {
        const childClass = child.classEnrollments[0]?.class?.name || 'Non assignée';
        
        // Notes
        const childGrades = await db.grade.findMany({
          where: { studentId: child.id },
          include: { course: true }
        });
        const childAverage = childGrades.length > 0 ? (childGrades.reduce((sum, g) => sum + g.score, 0) / childGrades.length) : null;
        const avgText = childAverage !== null ? `${childAverage.toFixed(2)}/20` : 'Pas de note';

        // Absences
        const childAttendance = await db.attendance.findMany({
          where: { studentId: child.id }
        });
        const childAbsences = childAttendance.filter(a => a.status === 'absent').length;
        const childLates = childAttendance.filter(a => a.status === 'late').length;

        // Paiements
        const childPayments = await db.payment.findMany({
          where: { studentId: child.id }
        });
        const pendingFees = childPayments.filter(p => p.status !== 'paid').reduce((s, p) => s + p.amount, 0);

        childrenContext += `🧒 Enfant : ${child.fullName}
  - Classe : ${childClass}
  - Moyenne : ${avgText}
  - Absences : ${childAbsences} absences, ${childLates} retards
  - Frais dus : ${pendingFees}
  ${childAbsences > 2 ? `  - ⚠️ ALERTE : ${child.fullName} a dépassé le seuil de 2 absences (${childAbsences} absences) !` : ''}
`;
      }

      schoolContext = `Parent : ${user?.fullName}
Code de parrainage parent : ${userPreferences.parentCode || 'Disponible sur le tableau de bord'}
Suivi de la fratrie :
${childrenContext || 'Aucun enfant lié pour le moment.'}
`;

    } else if (role === 'ADMIN') {
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

      const recentStudents = await db.user.findMany({
        where: { schoolId, role: 'STUDENT' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { fullName: true, createdAt: true },
      });

      const todayStr = new Date().toISOString().split('T')[0];
      const absentTeachers = await db.attendance.findMany({
        where: {
          schoolId,
          date: todayStr,
          student: { role: 'TEACHER' },
          status: 'absent'
        },
        include: { student: true }
      });
      const absentTeachersNames = absentTeachers.map(a => a.student.fullName).join(', ') || 'Aucun enseignant absent aujourd\'hui';

      schoolContext = `Administrateur : ${user?.fullName}
📊 ÉCOSYSTÈME SCOLAIRE :
  - 👨‍🎓 Élèves actifs : ${studentCount} (dont bloqués/inactifs : ${blockedStudents})
  - 👨‍🏫 Professeurs : ${teacherCount}
  - 👪 Parents : ${parentCount}
  - 🏫 Classes : ${classCount}
  - 📚 Cours : ${courseCount}
  - Ratios : ${(studentCount / (teacherCount || 1)).toFixed(1)} élèves/professeur

💰 TRÉSORERIE ET AUDIT FINANCIER :
  - Revenus collectés : ${totalRevenue} FCFA/USD
  - Factures en attente : ${pendingPayments}
  - Factures en retard : ${overduePayments}

🏫 DÉTAIL DES STRUCTURES :
${classes.map(c => `  - ${c.name} (${c.level}) : ${c._count.enrollments} élèves (Frais : ${c.fees} par mois/an)`).join('\n')}

🆕 DERNIERS INSCRITS :
${recentStudents.map(s => `  - ${s.fullName} (inscrit le ${new Date(s.createdAt).toLocaleDateString('fr-FR')})`).join('\n')}

📋 REGISTRES ET CONFORMITÉ :
  - Comptes en attente d'activation : ${pendingUsers}
  - Profs absents ce jour (${todayStr}) : ${absentTeachersNames}
`;
    }

  } catch (err) {
    console.error('Erreur construction contexte database:', err);
  }

  // Intégrer les documents dans la conversation
  if (conversation.documents.length > 0) {
    schoolContext += `\n📎 DOCUMENTS PARTAGÉS DANS CETTE CONVERSATION :\n`;
    conversation.documents.forEach((doc) => {
      schoolContext += `\n[Fichier: ${doc.name} (Type: ${doc.mimeType})]\n`;
      schoolContext += `${doc.extractedText?.slice(0, 3500) || ''}\n`;
    });
  }

  const historyMessages = conversation.messages.slice(-10).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  const isFirstMessage = !conversation.salutationDone;

  const systemPrompt = buildSystemPrompt(
    user?.fullName || 'utilisateur',
    role,
    schoolContext,
    isFirstMessage,
    preferencesStr,
  );

  // Enregistrer le message de l'utilisateur
  await db.aiMessage.create({
    data: { conversationId: conversation.id, role: 'user', content: message },
  });

  if (isFirstMessage) {
    await db.aiConversation.update({
      where: { id: conversation.id },
      data: { salutationDone: true },
    });
  }

  // Titrer la conversation si elle est vide
  if (conversation.messages.length === 0) {
    const title = message.length > 40 ? message.slice(0, 40) + '…' : message;
    await db.aiConversation.update({
      where: { id: conversation.id },
      data: { title },
    });
  }

  const conversationIdFinal = conversation.id;
  const encoder = new TextEncoder();

  // ─── ROUTAGE INTELLIGENT (Choix local ou cloud) ───
  const hasDocuments = conversation.documents.length > 0;
  const requiresCloud = checkRequiresCloud(message, hasDocuments);

  let runCloud = useOpenRouter && (requiresCloud || !useLocal);

  if (!runCloud && useLocal) {
    // Essayer de répondre localement d'abord
    const localReply = await generateLocalResponse({
      message,
      schoolContext,
      userName: user?.fullName || 'utilisateur',
      userRole: role,
      historyMessages,
    });

    const isFallback = 
      localReply.includes("Je n'ai pas bien compris") ||
      localReply.includes("Pouvez-vous reformuler") ||
      localReply.includes("Désolé, je n'ai pas saisi");

    if (isFallback && useOpenRouter) {
      // Escalader au cloud (OpenRouter)
      runCloud = true;
    } else {
      // Enregistrer et streamer la réponse locale
      // Détecter et sauvegarder les préférences utilisateur
      const prefRegex = /\[PREF:\s*([^=]+)\s*=\s*([^\]]+)\]/gi;
      let match;
      const newPrefs = { ...userPreferences };
      let prefChanged = false;

      while ((match = prefRegex.exec(localReply)) !== null) {
        const key = match[1].trim();
        const val = match[2].trim();
        newPrefs[key] = val;
        prefChanged = true;
      }

      if (prefChanged) {
        try {
          const uploadsDir = join(process.cwd(), 'public', 'uploads');
          await fs.mkdir(uploadsDir, { recursive: true });
          await fs.writeFile(prefPath, JSON.stringify(newPrefs, null, 2), 'utf-8');
        } catch {}
      }

      const cleanReply = localReply.replace(/\[PREF:\s*[^\]]+\]/gi, '').trim();

      await db.aiMessage.create({
        data: { conversationId: conversationIdFinal, role: 'assistant', content: cleanReply },
      });
      await db.aiConversation.update({
        where: { id: conversationIdFinal },
        data: { updatedAt: new Date() },
      });

      const stream = new ReadableStream({
        async start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ token: cleanReply, conversationId: conversationIdFinal })}\n\n`,
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
  }

  // Appel Cloud (OpenRouter)
  let aiResponse: Response;
  try {
    aiResponse = await generateOpenRouterResponse({
      message,
      schoolContext,
      userName: user?.fullName || 'utilisateur',
      userRole: role,
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
                // Envoyer le token nettoyé ou brut au client (on l'envoie brut pour le streaming et on nettoie à la fin)
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
          // Détecter et sauvegarder les préférences utilisateur
          const prefRegex = /\[PREF:\s*([^=]+)\s*=\s*([^\]]+)\]/gi;
          let match;
          const newPrefs = { ...userPreferences };
          let prefChanged = false;

          while ((match = prefRegex.exec(fullReply)) !== null) {
            const key = match[1].trim();
            const val = match[2].trim();
            newPrefs[key] = val;
            prefChanged = true;
          }

          if (prefChanged) {
            try {
              const uploadsDir = join(process.cwd(), 'public', 'uploads');
              await fs.mkdir(uploadsDir, { recursive: true });
              await fs.writeFile(prefPath, JSON.stringify(newPrefs, null, 2), 'utf-8');
            } catch (err) {
              console.error('Erreur sauvegarde préférences:', err);
            }
          }

          const cleanReply = fullReply.replace(/\[PREF:\s*[^\]]+\]/gi, '').trim();

          await db.aiMessage.create({
            data: { conversationId: conversationIdFinal, role: 'assistant', content: cleanReply },
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