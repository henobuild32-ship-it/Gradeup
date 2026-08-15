🎓 GradeUp - CAHIER DES CHARGES COMPLET POUR IA DÉVELOPPEUSE
Version: 2.0 Enterprise | Créé par: Axions Labs
Objectif: Construire une plateforme scolaire 100% fonctionnelle, 0% maquette. Chaque bouton doit faire une vraie action en base de données.

0. INSTRUCTION ABSOLUE POUR L'IA QUI LIT CE FICHIER
Tu es une IA développeuse senior Full-Stack. Tu dois construire GradeUp exactement comme décrit ici.

RÈGLE D'OR : AUCUN BOUTON MORT.
Si un bouton existe dans l'UI, il DOIT :

Avoir un onClick réel
Appeler une vraie API /api/...
Avoir un état loading (spinner / disabled)
Avoir un état success (toast + refresh data via React Query)
Avoir un état error (toast d'erreur explicite)
Mettre à jour la base de données Prisma (pas de console.log, pas de alert("bientôt disponible"))
CE QUI EST INTERDIT :

❌ mockData, fakeUsers, dummyLessons en production
❌ TODO, coming soon, not implemented
❌ Stats hardcodées (ex: users: 120). Tout vient de GET /api/stats
❌ localStorage pour l'utilisateur. Auth = cookies HTTP-only uniquement (voir section 5)
❌ Faire confiance à l'ID envoyé par le client. Toujours vérifier la session côté serveur via getSessionUser(req)
Si une fonctionnalité n'est pas détaillée ici, applique le bon sens d'une vraie école et implémente-la en 100% fonctionnel avec vraie donnée.

1. VISION PRODUIT
GradeUp gère 4 rôles dans UNE seule application Next.js :

Rôle	Couleur	Accès principal
ADMIN	from-blue-600 to-blue-500	Tout gère. Crée l'école, les classes, les utilisateurs, voit tous les paiements.
TEACHER	from-emerald-600 to-emerald-500	Gère ses cours, leçons, notes, présences, devoirs. Ne voit que ses classes.
STUDENT	from-violet-600 to-violet-500	Consulte ses cours/leçons/notes/paiements. Génère son code parent.
PARENT	from-amber-600 to-amber-500	Suit son/ses enfant(s) via code parent. Lecture seule.
Langue UI: Français 100%. Devise configurable.

2. STACK TECHNIQUE NON-NÉGOCIABLE
Frontend: Next.js 14+ (App Router), React 18, TypeScript strict, Tailwind CSS, shadcn/ui + Radix UI, Zustand (store global), TanStack Query (cache serveur), next-themes (dark mode)

Backend: Next.js API Routes, Prisma ORM, PostgreSQL (pas SQLite en prod)

Services:

Supabase: Auth Realtime + Storage (fichiers) + Realtime (websockets)
GLM (Zhipu AI): glm-4.5-flash pour Gradie IA
Jitsi Meet External API: Pour Grada Vio (visio en iframe, pas de serveur)
PawaPay: Paiements mobiles (optionnel)
Outils obligatoires:

zod pour validation de TOUS les formulaires et API
react-hook-form + zodResolver
date-fns pour les dates
lucide-react pour icônes
3. MODÈLE DE DONNÉES PRISMA - SOURCE DE VÉRITÉ
Tu dois implémenter ce schéma exact. Aucune table manquante = bug.

prisma
model School {
  id             String   @id @default(cuid())
  name           String
  email          String
  inviteCode     String   @unique // ex: GRADEUP-XXXX
  currency       String   @default("USD")
  createdAt      DateTime @default(now())
  users          User[]
  classes        SchoolClass[]
  years          SchoolYear[]
}

model User {
  id             String   @id @default(cuid())
  email          String   @unique
  password       String   // hash scrypt, JAMAIS en clair
  name           String
  role           Role     // ADMIN, TEACHER, STUDENT, PARENT
  schoolId       String
  school         School   @relation(fields: [schoolId], references: [id])
  isActive       Boolean  @default(true)
  avatarUrl      String?
  
  // STUDENT specifics
  classId        String?
  class          SchoolClass? @relation(fields: [classId], references: [id])
  parentCode     String?  @unique // code généré pour parent ex: PAR-8CH4K9
  parentId       String?
  parent         User?    @relation("ParentChildren", fields: [parentId], references: [id])
  children       User[]   @relation("ParentChildren")
  
  // TEACHER specifics
  courses        Course[]
  
  // Common
  grades         Grade[]
  attendances    Attendance[]
  payments       Payment[]
  messagesSent   Message[] @relation("Sent")
  messagesRecv   Message[] @relation("Received")
  favoris        Favori[]
  aiMemories     AiMemory[]
  aiConversations AiConversation[]
  createdAt      DateTime @default(now())
}

model SchoolClass {
  id             String @id @default(cuid())
  name           String // ex: "6ème A"
  level          Level  // MATERNELLE, PRIMAIRE, SECONDAIRE
  fees           Float
  schoolId       String
  school         School @relation(fields: [schoolId], references: [id])
  students       User[]
  courses        Course[]
}

model Course {
  id             String @id @default(cuid())
  title          String
  description    String
  classId        String
  class          SchoolClass @relation(fields: [classId], references: [id])
  teacherId      String
  teacher        User @relation(fields: [teacherId], references: [id])
  lessons        Lesson[]
  grades         Grade[]
  homeworks      Homework[]
  schedules      CourseSchedule[]
}

model Lesson {
  id             String @id @default(cuid())
  title          String
  contentMdx     String @db.Text // contenu riche MDX
  courseId       String
  course         Course @relation(fields: [courseId], references: [id])
  files          String[] // URLs Supabase Storage
  createdAt      DateTime @default(now())
}

model Grade {
  id             String @id @default(cuid())
  studentId      String
  student        User @relation(fields: [studentId], references: [id])
  courseId       String
  course         Course @relation(fields: [courseId], references: [id])
  term           Int // 1, 2, 3
  score          Float // ex: 14.5
  maxScore       Float @default(20)
  comment        String?
  createdAt      DateTime @default(now())
  @@unique([studentId, courseId, term])
}

model Homework {
  id             String @id @default(cuid())
  title          String
  description    String @db.Text
  dueDate        DateTime
  courseId       String
  course         Course @relation(fields: [courseId], references: [id])
  createdAt      DateTime @default(now())
}

model Attendance {
  id             String @id @default(cuid())
  studentId      String
  student        User @relation(fields: [studentId], references: [id])
  date           DateTime
  status         AttendanceStatus // PRESENT, ABSENT, LATE
  reason         String?
}

model Payment {
  id             String @id @default(cuid())
  studentId      String
  student        User @relation(fields: [studentId], references: [id])
  amount         Float
  month          Int // 1-12
  year           Int
  status         PaymentStatus // PAID, PENDING, LATE
  method         String? // Mobile Money, Cash...
  createdAt      DateTime @default(now())
}

model SchoolYear {
  id             String @id @default(cuid())
  schoolId       String
  school         School @relation(fields: [schoolId], references: [id])
  academicYear   String // "2024-2025"
  status         YearStatus // ACTIVE, CLOSED, LOCKED
  closedAt       DateTime?
  promotedCount  Int @default(0)
  repeatCount    Int @default(0)
  leavingCount   Int @default(0)
}

model VideoConference {
  id             String @id @default(cuid())
  title          String
  type           String // INSTANT, SCHEDULED
  status         String // WAITING, LIVE, ENDED
  isLocked       Boolean @default(false)
  creatorId      String
  schoolId       String
  jitsiRoomName  String @unique
  scheduledAt    DateTime?
  participants   Participant[]
  recordings     Recording[]
}

model Participant {
  id             String @id @default(cuid())
  conferenceId   String
  conference     VideoConference @relation(fields: [conferenceId], references: [id])
  userId         String
  role           String // HOST, CO_HOST, PARTICIPANT
  joinedAt       DateTime @default(now())
}

model Ressource {
  id             String @id @default(cuid())
  title          String
  description    String?
  fileUrl        String? // ou externalLink
  externalLink   String?
  subject        String
  level          String
  category       String // COURS, EXERCICE, EXAM, VIDEO...
  visibility     String // PUBLIC, SCHOOL, CLASS, PRIVATE
  authorId       String
  classId        String?
  createdAt      DateTime @default(now())
  favoris        Favori[]
}

model Favori {
  id           String @id @default(cuid())
  userId       String
  user         User @relation(fields: [userId], references: [id])
  ressourceId  String
  ressource    Ressource @relation(fields: [ressourceId], references: [id])
  @@unique([userId, ressourceId])
}

// IA & Comms
model AiConversation { id String @id @default(cuid()) userId String user User @relation(fields:[userId], references:[id]) title String messages Json isPinned Boolean @default(false) isFavorite Boolean @default(false) createdAt DateTime @default(now()) }
model AiMemory { id String @id @default(cuid()) userId String user User @relation(fields:[userId], references:[id]) fact String @db.Text createdAt DateTime @default(now()) }
model Message { id String @id @default(cuid()) senderId String sender User @relation("Sent", fields:[senderId], references:[id]) receiverId String receiver User @relation("Received", fields:[receiverId], references:[id]) content String @db.Text isRead Boolean @default(false) createdAt DateTime @default(now()) }
model Notification { id String @id @default(cuid()) schoolId String title String content String isRead Boolean @default(false) createdAt DateTime @default(now()) }

enum Role { ADMIN TEACHER STUDENT PARENT }
enum Level { MATERNELLE PRIMAIRE SECONDAIRE }
enum AttendanceStatus { PRESENT ABSENT LATE }
enum PaymentStatus { PAID PENDING LATE }
enum YearStatus { ACTIVE LOCKED CLOSED }
4. AUTHENTIFICATION - SÉCURITÉ MAXIMALE
Flow obligatoire:

POST /api/auth/register: Vérifie inviteCode School. Hash password avec scrypt + sel (fichier src/lib/password.ts). Crée User.
POST /api/auth/login: Vérifie email + password hash. Si OK, crée 2 cookies HTTP-only:
gradeup_token (15 min, JWT HS256 avec JWT_SECRET)
gradeup_refresh (7 jours, JWT avec JWT_REFRESH_SECRET)
GET /api/auth/me: Lit cookie gradeup_token, vérifie JWT via getSessionUser(req). Retourne user. Si expiré, tente refresh auto.
POST /api/auth/refresh: Vérifie gradeup_refresh, réémet gradeup_token.
POST /api/auth/logout: Supprime les 2 cookies.
Frontend: Zustand store ne contient PAS le user en localStorage. Au mount de src/app/page.tsx, appelle GET /api/auth/me pour hydrater le store. Si 401 -> page login.

Protection API: CHAQUE route /api/... doit commencer par const session = await getSessionUser(req); if(!session) return 401. Ne JAMAIS faire confiance à body.userId.

5. MATRICE DES PERMISSIONS - QUI PEUT FAIRE QUOI
Action	ADMIN	TEACHER	STUDENT	PARENT
Créer/Desactiver User	✅	❌	❌	❌
Créer Classe	✅	❌	❌	❌
Créer Cours	✅	✅ (siens)	❌	❌
Créer Leçon	❌	✅ (siens)	❌	❌
Saisir Notes	❌	✅ (siens)	❌	❌
Voir Notes	✅	✅ (siens)	✅ (siennes)	✅ (enfant)
Voir Paiements	✅	❌	✅ (siens)	✅ (enfant)
Générer Code Parent	❌	❌	✅	❌
Utiliser Code Parent	❌	❌	❌	✅ (à l'inscription)
Clôturer Année	✅	❌	❌	❌
Si un TEACHER tente GET /api/users -> 403. Si un STUDENT tente POST /api/courses -> 403.

6. SPÉCIFICATIONS FONCTIONNELLES - CHAQUE BOUTON DOIT FAIRE ÇA
A. ADMIN - Tout doit être CRUD réel
1. Dashboard:

Cartes stats: GET /api/stats -> { totalUsers, totalClasses, totalPaymentsPending, avgGrade }. Pas de chiffres en dur.
Bouton Actualiser -> queryClient.invalidateQueries(['stats'])
Graphique paiements -> données réelles des 6 derniers mois.
2. Gestion Utilisateurs:

Bouton + Nouvel Utilisateur: Ouvre Dialog shadcn. Form zod: name, email, role, classId (si STUDENT). POST /api/users -> toast success -> invalidateQueries.
Recherche rapide: Input avec debounce 300ms. GET /api/users?search=... -> dropdown avec avatar, rôle, classe. Clic -> fiche inline avec bouton Voir Profil.
Tableau users: Colonnes avec actions: Modifier (PUT /api/users/[id]), Désactiver (PUT isActive=false), Supprimer (DELETE avec confirmation Dialog).
Export CSV: Bouton Exporter CSV -> GET /api/users/export -> génère CSV UTF-8 avec BOM \uFEFF pour Excel.
3. Gestion Classes:

Bouton Créer Classe: name, level, fees. POST /api/classes.
Dans chaque ligne classe: Gérer Élèves -> Sheet qui liste élèves actuels + ajoute via search. Voir Paiements.
4. Paiements:

Filtres par Classe / Statut / Mois. Tout filtre doit re-fetch GET /api/payments?classId=&status=.
Bouton Marquer Payé: PUT /api/payments/[id] { status: PAID }
Bouton Exporter Paiements: CSV.
5. Notifications: Bouton Notifier École Entière: POST /api/notifications { title, content, schoolId } -> crée une notif pour tous + broadcast Realtime.

B. TEACHER - Cœur pédagogique
1. Dashboard: Mes Cours (3), Mes Élèves (45), Leçons ce mois (12). + Conseil du jour (via Gradie IA).

2. Cours: Bouton Nouveau Cours: title, description, classId (select parmi ses classes). POST /api/courses.

3. Leçons (Le plus critique):

Bouton Nouvelle Leçon: Dialog avec MDX Editor. Champs: title, courseId, contentMdx, fichier (upload vers /api/resources/upload -> Supabase Storage -> retourne URL). POST /api/lessons.
Timeline visuelle: GET /api/lessons?courseId=. Chaque leçon a boutons Modifier, Supprimer, Voir Fichiers.
Aucun lorem ipsum. Si vide: Empty state avec illustration + bouton Créer première leçon.
4. Notes: Vue tableau Excel-like.

Select Classe -> Cours -> Trimestre. GET /api/grades?classId=&courseId=&term=
Chaque cellule note est un Input. onBlur -> POST /api/grades { studentId, courseId, term, score, maxScore, comment } avec upsert (unique contrainte).
Validation: score <= maxScore, 0-20.
5. Présences: Calendrier. Pour chaque jour, liste élèves avec 3 boutons radio: Présent/Absent/Retard. POST /api/attendance/bulk (tableau). Raison obligatoire si Absent.

6. Devoirs: Titre, Description, Date Limite, Cours. POST /api/homeworks.

C. STUDENT
1. Dashboard: Anneau progression SVG animé (moyenne générale). Prochains devoirs (GET /api/homeworks?myClass=true). Dernières leçons.

2. Cours/Leçons: Lecture seule. Bouton Télécharger Fichier -> window.open(fileUrl). Pas de bouton modifier.

3. Notes: Graphique évolution par trimestre (recharts). Tableau par matière avec moyenne calculée côté serveur AverageService.

4. Code Parent: Bouton Générer mon code parent: POST /api/users/me/parent-code -> génère PAR-XXXXXX unique, affiche avec bouton Copier + Régénérer. Si déjà généré, affiche le code existant.

D. PARENT
Inscription: Champ Code Parent de votre enfant obligatoire. POST /api/auth/register vérifie parentCode existe, lie parentId.
Dashboard: Sélecteur Mes Enfants si plusieurs. Affiche notes, paiements, absences de l'enfant sélectionné. GET /api/students/[childId]/grades.
Pour TOUS les rôles:

Mode Sombre: Toggle dans header next-themes, persistant.
Palette Commande Cmd+K: cmdk lib, recherche navigation + utilisateurs.
Messagerie: GET /api/messages?with=userId, POST /api/messages. Temps réel via Supabase.
Notifications: Badge non-lu, PUT /api/notifications/[id]/read.
Profil: PUT /api/users/me { name, avatar }, upload avatar vers Supabase.
7. API CONTRACT - 23+ ROUTES MINIMUM
Chaque route doit:

Valider avec Zod
Vérifier session getSessionUser
Vérifier permission rôle
Retourner JSON typé { data, error }
Liste obligatoire (à implémenter):
POST /api/auth/register, login, /api/auth/me, refresh, logout
GET/POST /api/users, GET/PUT/DELETE /api/users/[id], POST /api/users/me/parent-code
GET/POST /api/classes, PUT/DELETE /api/classes/[id]
GET/POST /api/courses, PUT/DELETE /api/courses/[id]
GET/POST /api/lessons, PUT/DELETE /api/lessons/[id]
GET/POST /api/grades, PUT /api/grades/[id] + GET /api/stats/averages
GET/POST /api/homeworks
GET/POST /api/attendance, POST /api/attendance/bulk
GET/POST /api/payments, PUT /api/payments/[id]
GET/POST /api/messages
GET/POST /api/notifications, PUT /api/notifications/[id]/read
GET /api/stats
GET/POST /api/resources, POST /api/resources/upload, POST /api/resources/[id]/favorite
GET/POST /api/conferences, POST /api/conferences/[id]/participants
GET/POST /api/ai/conversations, PATCH /api/ai/conversations/[id]
POST /api/ai/chat (GLM)
GET/POST /api/end-of-year, GET /api/stats/progression

8. LOGIQUE MÉTIER CRITIQUE (Ne pas simuler)
Moyenne: AverageService.calculate(studentId, term) -> moyenne pondérée de toutes les notes / maxScore * 20. Pas de valeur fixe.

Clôture Année Scolaire (Module Admin):

GET /api/end-of-year?classId= calcule pour chaque élève: moyenne générale, taux présence, autoDecision: si moyenne >=10 -> PROMOTED, 8-10 -> REPEAT, <8 -> LEAVE. Configurable.
POST /api/end-of-year { action: 'lock-year' } -> status LOCKED, empêche POST grades/attendance si year LOCKED.
POST /api/end-of-year { action: 'close-year' } -> TRANSACTION ATOMIQUE Prisma: crée nouvelle SchoolYear, met à jour chaque User avec nextClassId/nextStatus, notifie élèves/parents, broadcast year-closed via Supabase Realtime.
Paiement: Si paiement en retard > 30 jours, cron ou check à chaque GET -> status LATE + notification.

9. MODULES AVANCÉS DÉTAILLÉS
Grada Vio (Visio): Utilise jitsi-meet-external-api. src/components/gradeup/meeting-room.tsx charge script https://meet.jit.si/external_api.js uniquement au clic Rejoindre. Room name = gradeup-{schoolId}-{conferenceId}. Hôte peut lock, kick, promote. Salle d'attente gérée via table Participant.

Gradie IA Enterprise:

POST /api/ai/chat: Reçoit conversationId, message, files[]. Si fichier PDF/Image -> extrait texte (pdfjs + OCR via GLM vision). Appelle glm-completion.ts avec contexte + AiMemory (faits mémorisés). Si réponse contient [MEM: ...] -> sauvegarde dans AiMemory.
Features UI: Recherche conversations, Epingler, Favori, Renommer (PATCH), Copier message, Régénérer réponse, TTS (Web Speech API), STT (Web Speech API), Export MD, Langues FR/EN/Lingala/Swahili.
Bibliothèque: GET /api/resources?subject=Math&level=Primaire. Upload via POST /api/resources/upload (Supabase Storage bucket gradeup, sinon fallback /public/uploads). Si description vide, appelle GLM pour auto-générer.

Temps Réel (Supabase Realtime):
Helper src/lib/realtime.ts:

subscribeToMessages(userId, callback) -> canal postgres_changes sur table Message
subscribeToParticipants(conferenceId, callback) -> sur Participant
subscribeToYearClosed(schoolId, callback) -> canal broadcast school-year-{schoolId}
Toujours avec fallback polling (20s) si Supabase non configuré.
SQL à exécuter dans Supabase: alter publication supabase_realtime add table "Message", "Participant", "Notification", "SchoolYear";
Performance: Dans src/app/page.tsx, TOUTES les pages (sauf auth) doivent être dynamic(() => import(...), { ssr: false, loading: () => <Skeleton /> }). Jitsi script chargé lazy.

10. FRONTEND ARCHITECTURE
src/
├── app/
│   ├── page.tsx (Router principal avec dynamic imports)
│   ├── api/ (toutes les routes)
│   └── layout.tsx (ThemeProvider + QueryClientProvider)
├── components/
│   ├── gradeup/ (31 composants: admin-dashboard, teacher-grades, student-dashboard, chat-page, ai-assistant, video-hub, library-page, end-of-year...)
│   └── ui/ (shadcn: button, dialog, sheet, table...)
├── lib/
│   ├── store.ts (Zustand: user, school, theme, selectedChild)
│   ├── types.ts (tous les types TS)
│   ├── auth/session.ts (getSessionUser)
│   ├── password.ts (scrypt hash)
│   ├── realtime.ts (Supabase)
│   └── ai/glm-completion.ts
└── hooks/ (useDebounce, useRealtime...)
Gestion d'état:

Serveur: React Query partout. Pas de useEffect fetch.
Client: Zustand pour user/school/theme.
Formulaire: react-hook-form + zod.
Responsive: Sidebar = Sheet sur <md. Dialogs = fullscreen sur mobile. Utiliser sm:, md:, lg: partout.

11. DESIGN SYSTEM
Couleur primaire: bg-gradient-to-br from-blue-600 to-blue-700 text-white
Cartes: rounded-2xl shadow-sm border bg-card hover:shadow-md transition-all
Animations: animate-in fade-in slide-in-from-bottom-2, hover:translate-y-[-2px]
Empty states: Toujours une illustration + texte + CTA bouton. Jamais de page blanche.
Loading: Skeleton shadcn, pas de spinner plein écran sauf auth.
Toasts: sonner ou useToast pour chaque action.
12. VARIABLES D'ENVIRONNEMENT
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..." # OBLIGATOIRE en prod pour uploads
SUPABASE_STORAGE_BUCKET="gradeup"
GLM_API_KEY="..." # Zhipu AI
GLM_MODEL="glm-4.5-flash"
JWT_SECRET="génère avec openssl rand -base64 32"
JWT_REFRESH_SECRET="génère autre"
NEXT_PUBLIC_VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
13. CHECKLIST DE VALIDATION FINALE - AVANT DE DIRE "C'EST FINI"
L'IA doit vérifier elle-même:

 Je peux créer une école avec code invite, puis créer ADMIN, TEACHER, STUDENT, PARENT et me connecter avec chaque rôle.
 En tant que TEACHER, je crée un cours -> une leçon avec fichier -> le fichier s'ouvre bien côté STUDENT.
 En tant que TEACHER, je saisis une note -> STUDENT la voit instantanément, PARENT la voit.
 En tant que STUDENT, je génère code parent -> PARENT s'inscrit avec ce code -> voit bien son enfant.
 Recherche utilisateur avec debounce fonctionne, affiche dropdown réel.
 Export CSV paiements ouvre bien dans Excel avec accents.
 Mode sombre persiste après refresh.
 Messagerie temps réel: 2 onglets ouverts, message apparaît sans refresh.
 Visio Jitsi se lance, micro/caméra/share screen fonctionnent.
 IA Gradie répond, mémorise [MEM:], upload PDF le résume.
 Bibliothèque: upload fichier + favori + filtre fonctionnent.
 Clôture année: lock empêche notes, close crée nouvelle année et notifie.
 Aucune page blanche, aucun bouton alert("bientôt"), aucune donnée fake.
Si un seul point échoue, corrige avant de livrer.

14. SI UNE INFO MANQUE DANS CE CAHIER
Applique cette règle: "Qu'est-ce qu'une vraie école attendrait ?"

Exemple: On n'a pas parlé de bulletin PDF? Implémente-le: GET /api/students/[id]/bulletin?term=1 génère PDF avec jspdf + notes + moyenne + appréciation.

On n'a pas parlé de oubli mot de passe? Implémente POST /api/auth/forgot-password.

Toujours implémenter en 100% réel, jamais en fake.

Fin du cahier. Maintenant code. Aucune excuse.
© Axions Labs Technologies - GradeUp 2.0 

