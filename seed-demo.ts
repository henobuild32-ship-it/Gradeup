import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log('🌱 Seeding demo data...');

  // ─── 1. Clear existing data (reverse dependency order) ───
  console.log('🗑️  Clearing existing data...');
  await db.$executeRawUnsafe('DELETE FROM Attendance');
  await db.$executeRawUnsafe('DELETE FROM Grade');
  await db.$executeRawUnsafe('DELETE FROM Homework');
  await db.$executeRawUnsafe('DELETE FROM Lesson');
  await db.$executeRawUnsafe('DELETE FROM Payment');
  await db.$executeRawUnsafe('DELETE FROM Notification');
  await db.$executeRawUnsafe('DELETE FROM Course');
  await db.$executeRawUnsafe('DELETE FROM EnrolledClass');
  await db.$executeRawUnsafe('DELETE FROM User');
  await db.$executeRawUnsafe('DELETE FROM SchoolClass');
  await db.$executeRawUnsafe('DELETE FROM School');
  console.log('✅ Data cleared.');

  // ─── 2. Create School ───
  console.log('🏫 Creating school...');
  const school = await db.school.create({
    data: {
      name: 'Institut Sainte-Marie',
      email: 'contact@stmarie.cd',
      password: 'admin123',
      currency: 'USD',
    },
  });
  console.log(`   Created: ${school.name}`);

  // ─── 3. Create Admin ───
  console.log('👤 Creating admin...');
  const admin = await db.user.create({
    data: {
      schoolId: school.id,
      fullName: 'Directeur Mbeki',
      email: 'admin@stmarie.cd',
      password: 'admin123',
      role: 'ADMIN',
    },
  });
  console.log(`   Created: ${admin.fullName}`);

  // ─── 4. Create 3 Classes ───
  console.log('📚 Creating classes...');
  const classA = await db.schoolClass.create({
    data: {
      schoolId: school.id,
      name: '6ème A',
      level: 'Primaire',
      fees: 50,
    },
  });
  const classB = await db.schoolClass.create({
    data: {
      schoolId: school.id,
      name: '5ème B',
      level: 'Primaire',
      fees: 45,
    },
  });
  const classC = await db.schoolClass.create({
    data: {
      schoolId: school.id,
      name: '4ème C',
      level: 'Secondaire',
      fees: 60,
    },
  });
  console.log(`   Created: ${classA.name}, ${classB.name}, ${classC.name}`);

  // ─── 5. Create 5 Teachers ───
  console.log('👨‍🏫 Creating teachers...');
  const teacherData = [
    { name: 'Prof. Kalala', subject: 'Mathématiques' },
    { name: 'Prof. Nsimba', subject: 'Français' },
    { name: 'Prof. Tshimanga', subject: 'Sciences' },
    { name: 'Prof. Kabongo', subject: 'Histoire-Géo' },
    { name: 'Prof. Lumumba', subject: 'Anglais' },
  ];
  const teachers: { id: string; name: string; subject: string }[] = [];
  for (const t of teacherData) {
    const teacher = await db.user.create({
      data: {
        schoolId: school.id,
        fullName: t.name,
        email: `${t.name.split(' ')[1]?.toLowerCase() || t.name.toLowerCase()}@stmarie.cd`,
        password: 'teacher123',
        role: 'TEACHER',
      },
    });
    teachers.push({ id: teacher.id, name: t.name, subject: t.subject });
  }
  console.log(`   Created ${teachers.length} teachers`);

  // ─── 6. Create 3 Parents ───
  console.log('👨‍👧 Creating parents...');
  const parentData = [
    { name: 'M. Mukendi', email: 'mukendi.parent@stmarie.cd' },
    { name: 'Mme Lushima', email: 'lushima.parent@stmarie.cd' },
    { name: 'M. Kabongo', email: 'kabongo.parent@stmarie.cd' },
  ];
  const parents: { id: string; name: string }[] = [];
  for (const p of parentData) {
    const parent = await db.user.create({
      data: {
        schoolId: school.id,
        fullName: p.name,
        email: p.email,
        password: 'parent123',
        role: 'PARENT',
      },
    });
    parents.push({ id: parent.id, name: p.name });
  }
  console.log(`   Created ${parents.length} parents`);

  // ─── 7. Create 12 Students (4 per class) ───
  console.log('🎓 Creating students...');
  const studentClassAssignment: { name: string; classIndex: number; parentIndex: number | null }[] = [
    { name: 'Jean Mukendi', classIndex: 0, parentIndex: 0 },
    { name: 'Marie Lushima', classIndex: 0, parentIndex: 1 },
    { name: 'Pierre Kabongo', classIndex: 0, parentIndex: 2 },
    { name: 'Grace Nsimba', classIndex: 0, parentIndex: null },
    { name: 'David Kalala', classIndex: 1, parentIndex: null },
    { name: 'Sarah Tshimanga', classIndex: 1, parentIndex: null },
    { name: 'Paul Mbeki', classIndex: 1, parentIndex: null },
    { name: 'Esther Lumumba', classIndex: 1, parentIndex: null },
    { name: 'Joel Mwamba', classIndex: 2, parentIndex: null },
    { name: 'Rachel Kanyinda', classIndex: 2, parentIndex: null },
    { name: 'Samuel Ngoy', classIndex: 2, parentIndex: null },
    { name: 'Naomie Bokamba', classIndex: 2, parentIndex: null },
  ];

  const classes = [classA, classB, classC];
  const students: { id: string; name: string; classId: string }[] = [];

  for (const s of studentClassAssignment) {
    const student = await db.user.create({
      data: {
        schoolId: school.id,
        fullName: s.name,
        email: `${s.name.split(' ')[1].toLowerCase()}@stmarie.cd`,
        password: 'student123',
        role: 'STUDENT',
        parentId: s.parentIndex !== null ? parents[s.parentIndex].id : null,
      },
    });

    await db.enrolledClass.create({
      data: {
        userId: student.id,
        classId: classes[s.classIndex].id,
      },
    });

    students.push({ id: student.id, name: s.name, classId: classes[s.classIndex].id });
  }
  console.log(`   Created ${students.length} students`);

  // ─── 8. Create Courses (one per teacher per class = 15 courses) ───
  console.log('📖 Creating courses...');
  const courses: { id: string; classId: string; teacherId: string; name: string; subject: string }[] = [];

  for (const teacher of teachers) {
    for (const cls of classes) {
      const courseName = `${teacher.subject} ${cls.name}`;
      const course = await db.course.create({
        data: {
          schoolId: school.id,
          classId: cls.id,
          teacherId: teacher.id,
          name: courseName,
          description: `Cours de ${teacher.subject} pour la classe ${cls.name}`,
        },
      });
      courses.push({
        id: course.id,
        classId: cls.id,
        teacherId: teacher.id,
        name: courseName,
        subject: teacher.subject,
      });
    }
  }
  console.log(`   Created ${courses.length} courses`);

  // ─── 9. Create 35 Lessons ───
  console.log('📝 Creating lessons...');
  const lessonTitlesBySubject: Record<string, string[]> = {
    'Mathématiques': [
      'Introduction aux fractions',
      'Addition et soustraction des fractions',
      'Multiplication des nombres décimaux',
      'Les pourcentages',
      'Géométrie : les triangles',
      'Proportionnalité et échelles',
      'Les angles et leur mesure',
    ],
    'Français': [
      'Les verbes du 1er groupe',
      'Les propositions subordonnées',
      'La conjugaison au passé composé',
      'Les figures de style',
      'La rédaction d\'un récit',
      'L\'analyse grammaticale',
      'Le vocabulaire de la description',
    ],
    'Sciences': [
      'Le système solaire',
      'Les états de la matière',
      'La photosynthèse',
      'Le corps humain : les organes',
      'Les forces et le mouvement',
      'L\'électricité et les circuits',
    ],
    'Histoire-Géo': [
      'La Révolution Congolaise',
      'Les grandes civilisations africaines',
      'La géographie de la RDC',
      'La colonisation et l\'indépendance',
      'Les fleuves et les montagnes',
      'Le commerce international',
    ],
    'Anglais': [
      'Present Simple vs Present Continuous',
      'Vocabulary : Daily Routines',
      'Irregular Verbs',
      'Reading Comprehension',
      'Writing a Letter',
      'Prepositions of Place',
    ],
  };

  const lessonContentBySubject: Record<string, string[]> = {
    'Mathématiques': [
      'Aujourd\'hui nous allons découvrir les fractions. Une fraction représente une partie d\'un tout. Par exemple, 1/2 représente la moitié d\'un objet.',
      'Nous apprenons à additionner et soustraire des fractions ayant le même dénominateur. Il suffit d\'additionner ou soustraire les numérateurs.',
      'La multiplication des nombres décimaux suit les mêmes règles que celle des nombres entiers. Il faut simplement compter le nombre total de décimales.',
      'Les pourcentages sont un cas particulier des fractions. 50% équivaut à 1/2, 25% à 1/4. Ils sont utilisés partout dans la vie quotidienne.',
      'Nous étudions les propriétés des triangles : la somme des angles est toujours égale à 180 degrés. Les triangles peuvent être équilatéraux, isocèles ou scalènes.',
      'La proportionnalité est un concept fondamental. Deux grandeurs sont proportionnelles si leur rapport est constant. Les échelles en sont une application concrète.',
      'Les angles se mesurent en degrés. Un angle droit mesure 90°, un angle plat 180°. Nous apprenons à utiliser le rapporteur pour mesurer les angles.',
    ],
    'Français': [
      'Les verbes du 1er groupe se terminent en -er. Ils se conjuguent de manière régulière avec les terminaisons : -e, -es, -e, -ons, -ez, -ent.',
      'Les propositions subordonnées dépendent de la proposition principale. Elles sont introduites par des conjonctions comme "que", "quand", "parce que".',
      'Le passé composé se forme avec l\'auxiliaire avoir ou être conjugué au présent, suivi du participe passé du verbe.',
      'Les figures de style enrichissent le langage : la métaphore, la comparaison, la personnification et l\'hyperbole sont les plus courantes.',
      'Pour rédiger un bon récit, il faut respecter la structure : situation initiale, élément perturbateur, péripéties, dénouement et situation finale.',
      'L\'analyse grammaticale permet d\'identifier la nature et la fonction de chaque mot dans une phrase. C\'est un exercice essentiel en français.',
      'Le vocabulaire de la description utilise les adjectifs qualificatifs, les comparatifs et les superlatifs pour donner vie au texte.',
    ],
    'Sciences': [
      'Le système solaire comprend 8 planètes qui tournent autour du Soleil. Mercure est la plus proche, Neptune la plus éloignée. La Terre est la 3ème planète.',
      'La matière existe en trois états : solide, liquide et gazeux. Les changements d\'état dépendent de la température et de la pression.',
      'La photosynthèse est le processus par lequel les plantes vertes utilisent la lumière du soleil pour transformer le CO2 et l\'eau en glucose et en oxygène.',
      'Le corps humain est composé de plusieurs systèmes : respiratoire, digestif, circulatoire, nerveux. Chaque système a un rôle spécifique et indispensable.',
      'Les forces peuvent mettre un objet en mouvement, modifier sa vitesse ou sa direction. La gravité est la force d\'attraction exercée par la Terre.',
      'Un circuit électrique simple comprend une source d\'énergie, des fils conducteurs et un récepteur. Le courant circule de la borne positive à la borne négative.',
    ],
    'Histoire-Géo': [
      'La Révolution Congolaise a marqué un tournant dans l\'histoire du pays. L\'accession à l\'indépendance en 1960 a été le résultat d\'une longue lutte politique.',
      'Les grandes civilisations africaines comme l\'Empire du Mali, le Royaume de Kongo et l\'Empire éthiopien ont eu des contributions majeures à l\'histoire mondiale.',
      'La RDC est le plus grand pays d\'Afrique centrale. Elle est riche en ressources naturelles : cuivre, cobalt, diamant, or, et possède la deuxième plus grande forêt tropicale.',
      'La colonisation belge a profondément transformé la société congolaise. L\'indépendance a été proclamée le 30 juin 1960 sous la direction de Patrice Lumumba.',
      'Le fleuve Congo est le deuxième plus long fleuve d\'Afrique après le Nil. Il traverse le pays d\'est en ouest sur plus de 4 700 km.',
      'Le commerce international relie les pays par les échanges de biens et services. La RDC exporte principalement des minerais et des produits agricoles.',
    ],
    'Anglais': [
      'Today we learn the difference between Present Simple (I play) and Present Continuous (I am playing). The first describes habits, the second describes actions happening now.',
      'Daily routines vocabulary includes: wake up, have breakfast, go to school, do homework, go to bed. Practice using these words in complete sentences.',
      'Irregular verbs do not follow the standard pattern: go/went, see/saw, take/took, give/gave. Memorization is key to mastering them.',
      'Reading comprehension involves understanding the main idea, finding specific details, and making inferences from the text. Always read the questions first.',
      'When writing a formal letter, include: sender\'s address, date, recipient\'s address, salutation, body paragraphs, and closing formula.',
      'Prepositions of place indicate location: in (inside), on (surface), at (specific point), under (below), next to (beside), between (in the middle of).',
    ],
  };

  let lessonCount = 0;
  for (const teacher of teachers) {
    const titles = lessonTitlesBySubject[teacher.subject] || [];
    const contents = lessonContentBySubject[teacher.subject] || [];
    for (const cls of classes) {
      const course = courses.find(
        (c) => c.teacherId === teacher.id && c.classId === cls.id
      );
      if (!course) continue;

      // Create 2-3 lessons per course
      const numLessons = randomBetween(2, 3);
      for (let i = 0; i < numLessons; i++) {
        const titleIdx = i % titles.length;
        await db.lesson.create({
          data: {
            schoolId: school.id,
            courseId: course.id,
            teacherId: teacher.id,
            title: titles[titleIdx] || `Leçon ${i + 1}`,
            content: contents[titleIdx] || 'Contenu de la leçon à venir.',
            createdAt: daysAgo(randomBetween(1, 30)),
          },
        });
        lessonCount++;
      }
    }
  }
  console.log(`   Created ${lessonCount} lessons`);

  // ─── 10. Create 55 Grades ───
  console.log('📊 Creating grades...');
  const comments = [
    'Bon travail !',
    'Peut mieux faire.',
    'Excellent !',
    'Bien, continuez ainsi.',
    'Effort insuffisant.',
    'Très bon niveau.',
    'À améliorer.',
    'Résultat satisfaisant.',
    'Félicitations !',
    'Besoin de plus d\'efforts.',
    'Progression notable.',
    'Moyenne de la classe.',
  ];
  const trimesters = ['1', '2', '3'];

  let gradeCount = 0;
  for (const course of courses) {
    // Get students in this class
    const classStudents = students.filter((s) => s.classId === course.classId);
    for (const student of classStudents) {
      // Each student has 1-2 grades per course
      if (Math.random() > 0.4) {
        const trimester = trimesters[randomBetween(0, 2)];
        await db.grade.create({
          data: {
            schoolId: school.id,
            courseId: course.id,
            studentId: student.id,
            teacherId: course.teacherId,
            score: randomBetween(4, 19),
            maxScore: 20,
            trimester,
            comment: comments[randomBetween(0, comments.length - 1)],
            createdAt: daysAgo(randomBetween(1, 60)),
          },
        });
        gradeCount++;
      }
      if (Math.random() > 0.6) {
        const trimester = trimesters[randomBetween(0, 2)];
        await db.grade.create({
          data: {
            schoolId: school.id,
            courseId: course.id,
            studentId: student.id,
            teacherId: course.teacherId,
            score: randomBetween(4, 19),
            maxScore: 20,
            trimester,
            comment: comments[randomBetween(0, comments.length - 1)],
            createdAt: daysAgo(randomBetween(1, 90)),
          },
        });
        gradeCount++;
      }
    }
  }
  console.log(`   Created ${gradeCount} grades`);

  // ─── 11. Create 15 Homework assignments ───
  console.log('📚 Creating homework...');
  const homeworkDescriptions: Record<string, string[]> = {
    'Mathématiques': [
      'Complétez les exercices 1 à 15 du chapitre sur les fractions. Montrez tous les calculs.',
      'Résolvez les problèmes de proportionnalité pages 45-46. Rédigez les réponses en phrases complètes.',
      'Faites le devoir maison sur les triangles. Construisez un triangle équilatéral et un triangle isocèle.',
    ],
    'Français': [
      'Conjuguez les verbes suivants au passé composé : manger, chanter, danser, parler, commencer.',
      'Rédigez un texte de 10 lignes décrivant votre matinée. Utilisez au moins 5 adjectifs qualificatifs.',
      'Analysez les propositions dans les phrases de l\'exercice page 78. Identifiez la nature de chaque proposition.',
    ],
    'Sciences': [
      'Dessinez et labellez les planètes du système solaire. Indiquez leur position par rapport au Soleil.',
      'Expliquez le cycle de l\'eau en 3 paragraphes. Utilisez les termes : évaporation, condensation, précipitation.',
      'Faites une recherche sur les sources d\'énergie renouvelable. Citez 5 exemples avec leurs avantages.',
    ],
    'Histoire-Géo': [
      'Rédigez une synthèse de 15 lignes sur l\'indépendance de la RDC. Mentionnez les dates et acteurs clés.',
      'Sur une carte vierge, situez les principales villes et fleuves de la RDC. Utilisez des couleurs différentes.',
      'Préparez une présentation orale de 5 minutes sur une civilisation africaine de votre choix.',
    ],
    'Anglais': [
      'Write 10 sentences using Present Simple and 10 using Present Continuous about your daily life.',
      'Learn the list of 20 irregular verbs by heart. Write each verb three times with its past tense.',
      'Write a formal letter to your pen pal describing your school and your favorite subjects.',
    ],
  };

  let hwCount = 0;
  for (const course of courses) {
    // Every course gets 1 homework = 15 total
    const descs = homeworkDescriptions[course.subject] || [];
    const desc = descs[randomBetween(0, descs.length - 1)] || 'Faites les exercices du chapitre.';
    await db.homework.create({
      data: {
        schoolId: school.id,
        courseId: course.id,
        teacherId: course.teacherId,
        title: `${course.subject} - Devoir ${formatDate(daysFromNow(randomBetween(3, 14)))}`,
        description: desc,
        dueDate: formatDate(daysFromNow(randomBetween(3, 14))),
        createdAt: daysAgo(randomBetween(0, 7)),
      },
    });
    hwCount++;
  }
  console.log(`   Created ${hwCount} homework assignments`);

  // ─── 12. Create 30+ Attendance records ───
  console.log('📋 Creating attendance records...');
  const statuses: ('present' | 'absent' | 'late')[] = ['present', 'absent', 'late'];
  const reasons: Record<string, string> = {
    absent: 'Maladie',
    late: 'Embouteillage',
    present: '',
  };

  let attendanceCount = 0;
  const usedKeys = new Set<string>();

  for (const student of students) {
    // Create attendance for 3 random days in the last 14 days
    const numDays = randomBetween(3, 4);
    for (let i = 0; i < numDays; i++) {
      const daysBack = i; // deterministic spacing
      const date = formatDate(daysAgo(daysBack));
      const key = `${student.id}-${date}`;

      if (usedKeys.has(key)) continue;
      usedKeys.add(key);

      const status = statuses[randomBetween(0, 2)];
      await db.attendance.create({
        data: {
          schoolId: school.id,
          studentId: student.id,
          teacherId: teachers[randomBetween(0, teachers.length - 1)].id,
          date,
          status,
          reason: reasons[status] || '',
          createdAt: daysAgo(daysBack),
        },
      });
      attendanceCount++;
    }
  }
  console.log(`   Created ${attendanceCount} attendance records`);

  // ─── 13. Create 20 Payments ───
  console.log('💰 Creating payments...');
  const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin'];
  const paymentStatuses: ('paid' | 'pending' | 'overdue')[] = ['paid', 'pending', 'overdue'];
  const methods = ['cash', 'virement', 'mobile'];

  let paymentCount = 0;
  // Create payments for each student (some paid, some pending, some overdue)
  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const cls = classes.find((c) => c.id === student.classId);
    if (!cls) continue;

    // Each student has 1-3 payments
    const numPayments = randomBetween(1, 3);
    for (let j = 0; j < numPayments; j++) {
      const statusIdx = i < 6 ? randomBetween(0, 1) : randomBetween(0, 2);
      await db.payment.create({
        data: {
          schoolId: school.id,
          studentId: student.id,
          amount: cls.fees,
          status: paymentStatuses[statusIdx],
          month: months[j % months.length],
          method: methods[randomBetween(0, methods.length - 1)],
          createdAt: daysAgo(randomBetween(1, 90)),
        },
      });
      paymentCount++;
    }
  }
  console.log(`   Created ${paymentCount} payments`);

  // ─── 14. Create 8 Notifications ───
  console.log('🔔 Creating notifications...');
  const notifications = [
    {
      message: 'Paiement du mois de Mars : veuillez régler les frais scolaires avant le 31 Mars.',
      targetRole: 'PARENT',
      targetClassId: '',
    },
    {
      message: 'Réunion parents-profs prévue le vendredi 15 Mars à 10h dans la salle de conférence.',
      targetRole: 'ALL',
      targetClassId: '',
    },
    {
      message: 'Bulletin du 2ème trimestre disponible. Consultez les résultats de vos enfants.',
      targetRole: 'PARENT',
      targetClassId: '',
    },
    {
      message: 'Examen de fin de trimestre prévu du 25 au 29 Mars. Préparez-vous !',
      targetRole: 'STUDENT',
      targetClassId: '',
    },
    {
      message: 'Nouveau cours de Sciences ajouté pour la classe 4ème C.',
      targetRole: 'STUDENT',
      targetClassId: classC.id,
    },
    {
      message: 'Journée portes ouvertes le 20 Avril. Tous les parents sont invités.',
      targetRole: 'ALL',
      targetClassId: '',
    },
    {
      message: 'Leçon sur la Révolution Congolaise publiée dans le cours Histoire-Géo 4ème C.',
      targetRole: 'STUDENT',
      targetClassId: classC.id,
    },
    {
      message: 'Devoir maison de Mathématiques à rendre avant le 18 Mars.',
      targetRole: 'STUDENT',
      targetClassId: classA.id,
    },
  ];

  for (const n of notifications) {
    await db.notification.create({
      data: {
        schoolId: school.id,
        senderId: admin.id,
        targetRole: n.targetRole,
        targetClassId: n.targetClassId,
        message: n.message,
        read: Math.random() > 0.5,
        createdAt: daysAgo(randomBetween(0, 14)),
      },
    });
  }
  console.log(`   Created ${notifications.length} notifications`);

  // ─── Summary ───
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('  ✅ Demo data seeded successfully!');
  console.log('═══════════════════════════════════════════════');
  console.log('');
  console.log('  School: Institut Sainte-Marie (contact@stmarie.cd)');
  console.log('  ─────────────────────────────────────────────');
  console.log('  Admin:   Directeur Mbeki / admin123');
  console.log('  Teachers: (5 accounts, password: teacher123)');
  for (const t of teachers) {
    console.log(`     - ${t.name} (${t.subject})`);
  }
  console.log('  Students: (12 accounts, password: student123)');
  for (const s of students) {
    const cls = classes.find((c) => c.id === s.classId);
    console.log(`     - ${s.name} (${cls?.name})`);
  }
  console.log('  Parents: (3 accounts, password: parent123)');
  for (const p of parents) {
    console.log(`     - ${p.name}`);
  }
  console.log('  ─────────────────────────────────────────────');
  console.log(`  Classes: ${classes.length}`);
  console.log(`  Courses: ${courses.length}`);
  console.log(`  Lessons: ${lessonCount}`);
  console.log(`  Grades: ${gradeCount}`);
  console.log(`  Homework: ${hwCount}`);
  console.log(`  Attendance: ${attendanceCount}`);
  console.log(`  Payments: ${paymentCount}`);
  console.log(`  Notifications: ${notifications.length}`);
  console.log('═══════════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
