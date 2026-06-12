# 📚 GradeUp — Documentation Complète de l'Application

> **Version :** 1.0 | **Créé par :** Axion Labs Technologies | **Dernière mise à jour :** Juin 2026

---

## Table des Matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture Technique](#2-architecture-technique)
3. [Base de Données](#3-base-de-données)
4. [Authentification & Inscription](#4-authentification--inscription)
5. [Interface Administrateur](#5-interface-administrateur)
6. [Interface Professeur](#6-interface-professeur)
7. [Interface Élève](#7-interface-élève)
8. [Interface Parent](#8-interface-parent)
9. [Fonctionnalités Transversales](#9-fonctionnalités-transversales)
10. [API Backend](#10-api-backend)
11. [Sécurité & Confidentialité](#11-sécurité--confidentialité)
12. [Application Mobile (PWA)](#12-application-mobile-pwa)

---

## 1. Vue d'ensemble

**GradeUp** est une plateforme de gestion scolaire tout-en-un, conçue pour digitaliser et centraliser l'ensemble des processus d'un établissement scolaire. Elle s'adresse à quatre profils d'utilisateurs : administrateurs, professeurs, élèves et parents.

### Philosophie de l'application

- **Multi-établissements** : Chaque école est une entité isolée, identifiée par un **code d'invitation unique** (ex. : `ECOLE-XXXXXX`).
- **Multi-rôles** : Un même système, quatre expériences distinctes et adaptées.
- **Temps réel** : Notifications en temps réel via SSE (Server-Sent Events) et Web Push.
- **IA intégrée** : L'assistant Gradie (IA) est disponible pour tous les rôles.
- **Progressive Web App** : Installable sur Android et iOS depuis le navigateur.

### Slogan

> *"ELEVATE YOUR FUTURE"*

---

## 2. Architecture Technique

### Stack Technologique

| Couche | Technologie |
|---|---|
| Framework principal | **Next.js 16.2.2** (App Router) |
| Langage | **TypeScript** |
| ORM / Base de données | **Prisma** + **PostgreSQL** |
| Composants UI | **shadcn/ui** (Radix UI) |
| Gestion d'état | **Zustand** avec persistance localStorage |
| Styles | **Tailwind CSS** |
| Notifications | **Sonner** (toasts animés) |
| Icônes | **Lucide React** |
| Thème | **next-themes** (mode clair / sombre) |
| Graphiques | **Recharts** (via charts-widget) |
| QR Code | **qrcode.react** |
| Messagerie temps réel | **SSE** (Server-Sent Events) |
| Visioconférences | **Jitsi Meet** (lien externe) |

### Architecture SPA (Single-Page Application)

GradeUp fonctionne comme une application monopage. Il n'y a **pas de routage URL traditionnel** entre les vues : la navigation entre les pages est gérée par un état global (`currentPage`) stocké dans Zustand.

Le fichier principal `src/app/page.tsx` contient un composant `PageRouter` qui écoute `currentPage` et affiche le composant correspondant.

### Gestion de l'état global (`useAppStore`)

Le store Zustand persiste les informations suivantes dans le `localStorage` du navigateur :

```typescript
{
  user: {
    id: string,
    fullName: string,
    role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT',
    schoolId: string,
    school: { name, inviteCode, currency, ... },
    photoUrl: string,
    email: string,
    // ... autres champs
  },
  currentPage: string,   // Page active (ex: 'admin-dashboard')
  sidebarOpen: boolean,  // État de la barre de navigation
}
```

---

## 3. Base de Données

### Modèles de données (Prisma Schema)

#### `School` (École)
Entité racine. Chaque école est **complètement isolée** des autres.

| Champ | Type | Description |
|---|---|---|
| `id` | String (cuid) | Identifiant unique |
| `name` | String | Nom de l'école |
| `email` | String (unique) | Email de l'administrateur |
| `password` | String | Mot de passe haché |
| `inviteCode` | String (unique) | Code de parrainage (ex: `ECOLE-XXXXXX`) |
| `currency` | String | Devise utilisée (défaut: `USD`) |

#### `User` (Utilisateur)
Un utilisateur appartient à une école. Il peut être Admin, Professeur, Élève ou Parent.

| Champ | Type | Description |
|---|---|---|
| `id` | String (cuid) | Identifiant unique |
| `schoolId` | String | Référence à l'école |
| `fullName` | String | Nom complet |
| `email` | String | Email (optionnel pour élèves) |
| `password` | String | Mot de passe |
| `role` | String | `ADMIN`, `TEACHER`, `STUDENT`, `PARENT` |
| `photoUrl` | String | URL de la photo de profil |
| `parentCode` | String (unique) | Code unique pour lier un parent à un élève |
| `parentId` | String? | Référence au parent (pour les élèves) |
| `phone` | String | Téléphone de l'élève |
| `parentPhone` | String | Téléphone du parent (1) |
| `parentPhone2` | String | Téléphone du parent (2) |
| `cardId` | String? | Numéro de carte d'identité scolaire |
| `postName` | String | Post-nom (nom du père) |
| `gender` | String | `M` ou `F` |
| `birthDate` | String | Date de naissance |
| `matricule` | String | Numéro de matricule |
| `academicYear` | String | Année scolaire (ex: `2025-2026`) |
| `section` | String | Section / Option |
| `active` | Boolean | Compte actif ou non |

#### `SchoolClass` (Classe)

| Champ | Type | Description |
|---|---|---|
| `id` | String | Identifiant |
| `schoolId` | String | École d'appartenance |
| `name` | String | Nom de la classe (ex: `6ème A`) |
| `level` | String | Niveau (ex: `Primaire`, `Secondaire`) |
| `fees` | Float | Frais de scolarité |

#### `Course` (Cours / Matière)

| Champ | Type | Description |
|---|---|---|
| `id` | String | Identifiant |
| `schoolId` | String | École |
| `classId` | String | Classe concernée |
| `teacherId` | String | Professeur responsable |
| `name` | String | Nom du cours |
| `description` | String | Description |

#### `Lesson` (Leçon)

| Champ | Type | Description |
|---|---|---|
| `title` | String | Titre de la leçon |
| `content` | String | Contenu textuel |
| `fileUrl` | String | URL d'un fichier joint |
| `fileName` | String | Nom du fichier joint |

#### `Grade` (Note simple)

| Champ | Type | Description |
|---|---|---|
| `score` | Float | Note obtenue |
| `maxScore` | Float | Note maximale (défaut: 20) |
| `trimester` | String | Trimestre (`1`, `2`, `3`) |
| `comment` | String | Commentaire du professeur |

#### `CourseWithPoints` (Matière pondérée — Bulletins)
Modèle étendu pour la génération des bulletins officiels congolais.

| Champ | Type | Description |
|---|---|---|
| `points` | Int | Coefficient de la matière |
| `maxScore` | Float | Score maximum |
| `trimester1Weight` | Float | Pondération 1er trimestre |
| `trimester2Weight` | Float | Pondération 2ème trimestre |

#### `DetailedGrade` (Note détaillée — Bulletins)

| Champ | Type | Description |
|---|---|---|
| `trimester` | String | Trimestre |
| `semester` | String | Semestre |
| `dailyWork` | Float | Travaux journaliers |
| `exam` | Float | Note d'examen |
| `total` | Float | Total calculé |

#### `Homework` (Devoir)

| Champ | Type | Description |
|---|---|---|
| `title` | String | Titre du devoir |
| `description` | String | Instructions |
| `dueDate` | String | Date de remise |

#### `Attendance` (Présence / Absence)

| Champ | Type | Description |
|---|---|---|
| `date` | String | Date de l'appel |
| `status` | String | `present`, `absent`, `late` |
| `reason` | String | Motif d'absence |

#### `Payment` (Paiement)

| Champ | Type | Description |
|---|---|---|
| `amount` | Float | Montant |
| `status` | String | `pending`, `paid`, `overdue` |
| `month` | String | Mois concerné |
| `method` | String | Méthode (`cash`, `mobile`, etc.) |

#### `Message` (Message)

| Champ | Type | Description |
|---|---|---|
| `content` | String | Contenu du message |
| `read` | Boolean | Lu ou non |
| `senderId` | String | Expéditeur |
| `recipientId` | String | Destinataire |

#### `Notification` (Notification)

| Champ | Type | Description |
|---|---|---|
| `title` | String | Titre |
| `message` | String | Corps |
| `type` | String | `INFO`, `GRADE`, `CONFERENCE`, `MESSAGE`, `CARD`, etc. |
| `priority` | String | `NORMAL`, `HIGH` |
| `read` | Boolean | Lue ou non |
| `targetRole` | String | `ALL`, `TEACHER`, `STUDENT`, `PARENT` |
| `targetClassId` | String | Classe cible (optionnel) |

#### `VideoConference` (Visioconférence)

| Champ | Type | Description |
|---|---|---|
| `title` | String | Titre de la réunion |
| `date` | String | Date |
| `time` | String | Heure |
| `roomUrl` | String | Lien Jitsi Meet |
| `targetRole` | String | Audience (`ALL`, `TEACHER`, etc.) |

#### `AiConversation` & `AiMessage` & `AiDocument` (IA Gradie)

- `AiConversation` : Une session de chat avec Gradie
- `AiMessage` : Un message dans la conversation (rôle `user` ou `assistant`)
- `AiDocument` : Un document uploadé pour analyse par l'IA

#### `ReportCard` (Bulletin Officiel)

Stocke un bulletin généré et sauvegardé dans la base.

| Champ | Type | Description |
|---|---|---|
| `reportNumber` | String (unique) | Numéro unique du bulletin |
| `trimester` | String | Trimestre |
| `academicYear` | String | Année scolaire |
| `totalPointsObtained` | Float | Points obtenus |
| `totalPointsPossible` | Float | Points possibles |
| `overallPercentage` | Float | Pourcentage global |
| `classRank` | Int | Rang dans la classe |
| `mention` | String | Mention (Passage, Échec, etc.) |
| `gradesData` | Json | Données complètes des notes |
| `studentSignatureUrl` | String | Signature numérique élève |
| `parentSignatureUrl` | String | Signature numérique parent |
| `teacherSignatureUrl` | String | Signature numérique prof |
| `directorSignatureUrl` | String | Signature numérique directeur |

#### `PushSubscription` (Notifications Push)

Stocke les abonnements Web Push pour les notifications en arrière-plan.

---

## 4. Authentification & Inscription

### Page d'accueil (Auth)

La page d'authentification est la **première page vue** par tout utilisateur non connecté. Elle présente un écran deux colonnes :
- **Gauche** : Panneau de branding animé avec gradient bleu/indigo, présentation des fonctionnalités clés.
- **Droite** : Formulaire de connexion / inscription.

### Connexion (`Connexion`)

Deux modes de connexion :

#### Mode Utilisateur (Élève / Professeur / Parent)
Champs requis :
1. **Code école** (format : `ECOLE-XXXXXX`) — fourni par l'administrateur
2. **Nom complet** — doit correspondre exactement au nom enregistré
3. **Mot de passe**

#### Mode Administrateur
Champs requis :
1. **Email de l'école** — email utilisé lors de la création de l'école
2. **Mot de passe**

### Inscription (`Inscription`)

Deux sous-modes :

#### Créer une école (Administrateur)
Réservé aux directeurs / administrateurs. Processus :
1. Saisir le **nom de l'école**
2. Saisir son **nom complet**
3. Saisir un **email**
4. Créer un **mot de passe** (minimum 4 caractères, indicateur de force affiché)
5. Confirmer le mot de passe
6. Cliquer sur **"Créer mon école"**

Résultat : Un **code d'invitation unique** est généré (ex: `ECOLE-A3K7PX`). Ce code est affiché à l'écran et doit être partagé avec les membres.

#### Rejoindre une école (Professeur / Élève / Parent)
Processus :
1. Saisir le **code école** → vérification automatique en temps réel (✓ vert si valide)
2. Saisir son **nom complet**
3. Choisir son **rôle** : Élève, Professeur, ou Parent
4. Si **Élève** : Sélectionner sa classe dans la liste des classes de l'école
5. Si **Professeur** : Sélection optionnelle des classes enseignées
6. Si **Parent** : Saisir le **code parent** de son enfant (code unique généré pour chaque élève)
7. Créer un mot de passe et confirmer
8. Cliquer sur **"Rejoindre"**

### Code Parent

Chaque élève possède un **code parent unique** (`parentCode`). Ce code permet à un parent de créer un compte lié à son enfant. Le code est visible dans la section "Cartes Élèves" (pour l'admin) et dans le profil de l'élève.

### Gestion de session

- La session est persistée dans le **localStorage** via Zustand.
- Une déconnexion efface le store et redirige vers la page d'authentification.
- Une boîte de dialogue de confirmation est affichée avant déconnexion.
- Un écran de démarrage (splash screen) est affiché au chargement pour éviter les flashs d'interface non stylisée.

---

## 5. Interface Administrateur

L'administrateur a accès à l'ensemble des fonctionnalités de gestion de l'école.

### Navigation (Menu latéral Admin)

| Menu | Page |
|---|---|
| 📊 Tableau de bord | Vue d'ensemble statistique |
| 👥 Utilisateurs | Gestion de tous les membres |
| 🏫 Classes | Gestion des classes |
| 💳 Paiements | Suivi financier |
| 🆔 Cartes Élèves | Cartes d'identité scolaires |
| ⚙️ Configuration | Paramètres de l'école |
| 📈 Rapports | Bulletins officiels |
| 🔔 Notifications | Envoi de notifications |
| 📚 Cours | Gestion des matières |
| 🤖 IA Gradie | Assistant IA |
| 🎥 Visioconférences | Réunions virtuelles |
| 💬 Messagerie | Messages internes |
| 📆 Calendrier | Calendrier scolaire |
| 👤 Profil | Profil utilisateur |
| 💡 Aide | Centre d'aide |

---

### 5.1 Tableau de Bord Admin

**Fonctionnalités :**

#### Statistiques globales (temps réel)
Cartes de statistiques dynamiques affichant :
- **Nombre total d'élèves**
- **Nombre de professeurs**
- **Nombre de parents**
- **Nombre de classes**
- **Revenus totaux perçus** (avec la devise configurée)
- **Revenus en attente**
- **Présences du jour** (nombre de présents / total attendu + pourcentage)
- **Nombre de cours**

#### Recherche rapide d'élève
Un champ de recherche avec auto-complétion (debounce 400ms) permet de trouver un élève instantanément par son nom et de voir sa classe.

#### Code d'invitation de l'école
- Affichage du **code école** actuel
- Bouton **Copier** pour copier le code dans le presse-papiers
- Bouton **Régénérer** pour générer un nouveau code (avec confirmation)

#### Paiements en retard
Liste des paiements en attente ou en retard, avec accès rapide à la gestion des paiements.

#### Graphiques
- **Revenus mensuels** : graphique en barres des revenus sur les derniers mois
- **Distribution des notes** : graphique de la répartition des notes par tranche

#### Fil d'activité
Affiche les événements récents de l'école (nouvelles inscriptions, paiements, notes ajoutées, etc.) avec horodatage.

---

### 5.2 Gestion des Utilisateurs

**URL interne :** `admin-users`

**Fonctionnalités :**

#### Onglets par rôle
4 onglets avec **compteurs précis** :
- **Tous** — liste complète
- **Élèves** — avec compteur réel
- **Professeurs** — avec compteur réel
- **Parents** — avec compteur réel

#### Tableau des utilisateurs
Colonnes :
- Photo / Avatar avec initiales
- Nom complet
- Rôle (badge coloré)
- Classe(s) associée(s)
- Email
- Actions

#### Recherche
Champ de recherche en temps réel pour filtrer les utilisateurs par nom.

#### Ajout d'un utilisateur
Modal avec formulaire :
- Nom complet
- Rôle (sélection)
- Classe(s) (si Élève ou Professeur)
- Email (optionnel)
- Mot de passe
- Code parent (si Parent — pour lier à un élève)

#### Modification d'un utilisateur
Édition de tous les champs du profil depuis un modal.

#### Suppression d'un utilisateur
Suppression avec confirmation. Supprime aussi toutes les données associées.

#### Activation / Désactivation
Possibilité d'activer ou désactiver un compte sans le supprimer.

---

### 5.3 Gestion des Classes

**URL interne :** `admin-classes`

**Fonctionnalités :**

- **Liste des classes** avec nom, niveau et nombre d'élèves inscrits
- **Créer une classe** : nom, niveau (Maternelle, Primaire, Secondaire…), frais de scolarité
- **Modifier une classe** : nom, niveau, frais
- **Supprimer une classe**
- **Voir les élèves** d'une classe

---

### 5.4 Gestion des Paiements

**URL interne :** `admin-payments`

**Fonctionnalités :**

#### Tableau de bord financier
- Total collecté
- Total en attente
- Taux de recouvrement (%)

#### Liste des paiements
Filtrables par :
- Statut (`payé`, `en attente`, `en retard`)
- Mois
- Classe

#### Ajouter un paiement
Pour un élève donné :
- Montant
- Mois
- Méthode de paiement (espèces, mobile money, etc.)
- Statut

#### Modification et suppression de paiements

#### Exportation
Possibilité d'exporter les données de paiement.

---

### 5.5 Cartes d'Identité Scolaires

**URL interne :** `admin-cards`

L'une des fonctionnalités phares de GradeUp. Permet de **générer, personnaliser et imprimer** des cartes d'identité scolaires professionnelles pour les élèves.

#### Design des Cartes
Chaque carte présente un design **premium** avec :
- Gradient bleu foncé / indigo
- **Photo de l'élève** (uploadable)
- Nom complet et post-nom
- Sexe (badge)
- **Matricule** (généré automatiquement basé sur l'initiale + année + mois)
- Classe et niveau
- Section / Option
- Date de naissance
- Groupe sanguin
- Nationalité
- Contacts (élève + parent)
- Adresse
- Année scolaire
- **QR Code** unique (lié à l'ID élève + cardId)
- Numéro de carte unique
- Date d'expiration
- Logo de l'école

#### Onglets de filtrage
Navigation par classe pour voir les cartes par groupe.

#### Actions disponibles
- **Générer les IDs** : Attribue automatiquement un `cardId` à tous les élèves sans carte
- **Nouvelle Carte (15$)** : Crée un nouvel élève avec sa carte (nécessite un paiement via PawaPay)
- **Modifier** une carte (hover sur la carte → bouton édition)
- **Imprimer** : Impression de toutes les cartes de la vue active (format A4, 2 colonnes)

#### Formulaire d'édition / création
Champs modifiables :
- Nom complet, post-nom, sexe
- Date de naissance, matricule
- Groupe sanguin, nationalité
- Classe, section, année scolaire
- Téléphone élève, téléphone parent (1 et 2)
- Email parent, adresse
- **Photo** (upload d'image, max 2MB, convertie en base64)
- Mot de passe (avec affichage/masquage)

#### Paiement requis
La création d'une nouvelle carte nécessite un paiement de **15 USD** via la passerelle PawaPay. Un dialogue explique les conditions avant redirection.

---

### 5.6 Configuration de l'École

**URL interne :** `admin-config`

**Fonctionnalités :**

- Modifier le **nom de l'école**
- Modifier l'**email** de l'administrateur
- Changer le **mot de passe** de l'école
- Configurer la **devise** (USD, EUR, CDF, XAF, etc.)
- Afficher / régénérer le **code d'invitation**
- Paramètres d'affichage et préférences

---

### 5.7 Rapports & Bulletins Officiels

**URL interne :** `admin-reports`

La fonctionnalité de rapports est la plus avancée de GradeUp. Elle permet de générer des **bulletins officiels interactifs** conformes au système scolaire de la **République Démocratique du Congo (RDC)**.

#### Deux modes de génération

##### Mode Base de données (DB)
Utilise les données réelles des élèves :
1. Sélectionner une classe
2. Sélectionner un élève
3. Sélectionner le trimestre (1, 2 ou 3)
4. Cliquer sur "Générer le bulletin"

Les informations de l'élève (nom, sexe, date de naissance, matricule, photo) et ses notes (travaux journaliers + examens) sont automatiquement importées.

##### Mode Manuel
Permet de créer un bulletin sans données de la base :
- Choisir un modèle : **Officiel RDC** (curriculum préchargé) ou **Vierge** (nombre de lignes personnalisable)
- Remplir les informations école et élève manuellement

#### Structure du Bulletin Officiel RDC
Le bulletin respecte le format officiel des établissements secondaires congolais :

**En-tête :**
- Drapeau de la RDC (SVG)
- Devise nationale, devise de l'école
- Nom et adresse de l'école (Province, Ville, Commune, Code)
- Filigrane : Armoiries de la RDC
- Numéro de bulletin (boîte chiffrée)
- Code-barres CSS dynamique

**Informations de l'élève :**
- Numéro permanent (boîte chiffrée, 13 chiffres)
- Nom, Post-nom, Prénom
- Sexe, Date et lieu de naissance
- Classe, Section/Option, Année scolaire
- Trimestre concerné

**Tableau des notes (interactif) :**

Chaque ligne de matière contient :
- Nom de la matière
- **TJ1** (Travaux Journaliers 1er semestre — 1ère période) + max
- **TJ2** (Travaux Journaliers 1er semestre — 2ème période) + max
- **Exam1** (Examen 1er semestre) + max
- **Total 1er semestre** (calculé automatiquement)
- **TJ3** (Travaux Journaliers 2ème semestre — 3ème période) + max
- **TJ4** (Travaux Journaliers 2ème semestre — 4ème période) + max
- **Exam2** (Examen 2ème semestre) + max
- **Total 2ème semestre** (calculé automatiquement)
- **Total général** (calculé)
- **Points maximum** de la matière
- **%** de réussite (calculé)
- **Repêchage %** (colonne éditable)
- **Signe repêchage** (+/-)

Toutes les colonnes de score sont **éditables en temps réel** avec validation automatique (score ≤ maximum autorisé).

**Curriculum officiel RDC préchargé (20 matières) :**
- Religion, Éducation à la Vie, Éducation Civique & Morale
- Biologie, Dessin, Éducation Musicale/Théâtrale, Éducation Physique & Sportive
- Géographie, Histoire, Informatique, Langues nationales, Sociologie, Travaux Manuels
- Chimie, Français, Mathématiques, Pédagogie, Physique, Psychologie
- Anglais, Philosophie

**Pied du bulletin :**
- Place dans la classe, Effectif total
- Application (A/B/C/D), Conduite (A/B/C/D)
- Décision du conseil de classe (PASSE / DOUBLE / RÉORIENTATION)
- Lieu et date de signature
- **4 zones de signatures** : Élève, Parent, Professeur titulaire, Directeur
- Mention globale

#### Actions sur les bulletins
- **Sauvegarder** : Enregistre le bulletin dans la base de données (archive)
- **Imprimer** : Impression haute résolution du bulletin
- **Réinitialiser** : Remet le bulletin à zéro

#### Archive des bulletins
Onglet "Archive" permettant de :
- Voir tous les bulletins sauvegardés par classe et par élève
- **Recharger** un bulletin archivé dans l'éditeur
- **Réimprimer** un bulletin archivé
- **Supprimer** un bulletin de l'archive

#### Gestion des cours (pour bulletins)
Depuis l'onglet "Cours", l'admin peut :
- Voir la liste des matières enregistrées pour chaque classe
- **Ajouter une matière** avec son coefficient (points), score maximum, et poids par trimestre
- **Modifier** et **supprimer** des matières

#### Statistiques d'utilisation
Affichage d'un compteur de bulletins générés par rapport à la limite autorisée.

---

### 5.8 Notifications

**URL interne :** `admin-notifications`

**Fonctionnalités :**

#### Envoyer une notification
Formulaire complet :
- **Titre** de la notification
- **Message** (corps)
- **Type** : INFO, GRADE, CONFERENCE, MESSAGE, CARD, CLASS, PROFILE, etc.
- **Priorité** : NORMAL ou HIGH
- **Audience cible** : Tous / Professeurs / Élèves / Parents
- **Classe cible** (optionnel) : Pour envoyer à une classe spécifique

Une fois envoyée, la notification est **reçue en temps réel** par les utilisateurs ciblés (toast animé + badge de compteur mis à jour).

#### Historique des notifications
Liste de toutes les notifications envoyées, avec statut de lecture.

---

### 5.9 Cours (Matières)

**URL interne :** `admin-courses`

**Fonctionnalités :**

- Liste de toutes les matières de l'école par classe
- **Ajouter un cours** : Nom, description, classe, professeur responsable
- **Modifier** un cours
- **Supprimer** un cours

---

### 5.10 Visioconférences

**URL interne :** `admin-conferences`

**Fonctionnalités :**

#### Programmer une visioconférence
Formulaire :
- **Titre** de la réunion (ex: "Réunion Parents-Professeurs")
- **Date**
- **Heure**
- **Audience cible** : Tous / Professeurs / Parents / Élèves

Lors de la validation, un **lien Jitsi Meet** est automatiquement généré et une **notification est envoyée** à tous les utilisateurs ciblés.

#### Liste des réunions planifiées
Tableau avec :
- Titre, date et heure
- Audience
- Bouton **"Rejoindre"** (ouvre Jitsi Meet dans un nouvel onglet)
- Bouton **Supprimer** (annule la réunion)

---

### 5.11 IA Gradie (Admin)

**URL interne :** `admin-ai`

Accès à l'assistant IA Gradie. Voir la section [9.3 IA Gradie](#93-ia-gradie) pour la documentation complète.

---

## 6. Interface Professeur

L'interface professeur est focalisée sur la gestion pédagogique quotidienne.

### Navigation (Menu latéral Professeur)

| Menu | Page |
|---|---|
| 📊 Tableau de bord | Vue d'ensemble |
| 📚 Cours | Mes matières |
| 📖 Leçons | Gestion des leçons |
| 📝 Notes | Saisie des notes |
| 📋 Devoirs | Gestion des devoirs |
| 📅 Absences | Appel et présences |
| 🤖 IA Gradie | Assistant IA |
| 💬 Messagerie | Messages internes |
| 📆 Calendrier | Calendrier scolaire |
| 👤 Profil | Profil utilisateur |
| 💡 Aide | Centre d'aide |

---

### 6.1 Tableau de Bord Professeur

**Fonctionnalités :**

Cartes de statistiques personnelles :
- **Mes cours** : Nombre de matières enseignées
- **Mes élèves** : Nombre d'élèves dans mes classes
- **Leçons publiées** : Nombre de leçons créées
- **Devoirs actifs** : Devoirs avec date de remise à venir
- **Présences du jour** : Taux de présence de mes classes

Accès rapide aux dernières actions :
- Dernières notes saisies
- Derniers devoirs créés
- Fil d'activité récente

Raccourcis vers les sections principales.

---

### 6.2 Mes Cours

**URL interne :** `teacher-courses`

**Fonctionnalités :**

- Liste de toutes les matières que le professeur enseigne (filtrées par `teacherId`)
- Pour chaque cours : nom, classe associée, description, nombre de leçons et de devoirs
- Vue détaillée d'un cours avec accès aux leçons, notes et devoirs associés

---

### 6.3 Leçons

**URL interne :** `teacher-lessons`

**Fonctionnalités :**

#### Créer une leçon
Formulaire :
- Sélectionner le **cours** (liste des cours du professeur)
- **Titre** de la leçon
- **Contenu** textuel (éditeur de texte)
- **Fichier joint** : Upload d'un fichier (PDF, Word, image, etc.) via un sélecteur de fichiers natif

#### Liste des leçons
Affichage de toutes les leçons créées par le professeur, groupées par cours, avec :
- Titre, contenu résumé
- Date de création
- Indicateur si un fichier est joint (avec lien de téléchargement)

#### Modifier / Supprimer une leçon

---

### 6.4 Notes

**URL interne :** `teacher-grades`

**Fonctionnalités :**

#### Saisie des notes
1. Sélectionner le **cours**
2. Sélectionner le **trimestre** (1, 2 ou 3)
3. Pour chaque élève de la classe : saisir la note et la note maximale

#### Tableau des notes
Vue d'ensemble de toutes les notes saisies, par cours et par trimestre :
- Nom de l'élève
- Note / Note max
- Score en pourcentage
- Commentaire
- Actions (modifier, supprimer)

#### Ajout / Modification
Modal de saisie avec :
- Élève (sélecteur)
- Cours (sélecteur)
- Trimestre
- Note obtenue
- Note maximale
- Commentaire optionnel

---

### 6.5 Devoirs

**URL interne :** `teacher-homework`

**Fonctionnalités :**

#### Créer un devoir
Formulaire :
- **Cours** (sélecteur parmi les matières du professeur)
- **Titre** du devoir
- **Description** / Instructions
- **Date de remise** (date picker)

#### Liste des devoirs
Affichage de tous les devoirs par cours, avec :
- Titre, description
- Date de remise (avec indicateur de délai)
- Nombre d'élèves concernés

#### Modifier / Supprimer

---

### 6.6 Appel (Absences)

**URL interne :** `teacher-attendance`

**Fonctionnalités :**

#### Faire l'appel
1. Sélectionner le **cours**
2. La liste des élèves de la classe s'affiche automatiquement
3. Pour chaque élève : marquer **Présent**, **Absent** ou **En retard**
4. Si absent : possibilité de saisir un **motif**
5. Soumettre l'appel

#### Historique des présences
Tableau chronologique des appels effectués, avec :
- Date
- Cours
- Nombre de présents / absents
- Détail par élève

#### Taux de présence
Statistiques de présence par élève et par cours.

---

### 6.7 IA Gradie (Professeur)

**URL interne :** `teacher-ai`

Accès à l'assistant IA Gradie. Voir la section [9.3 IA Gradie](#93-ia-gradie).

---

## 7. Interface Élève

L'interface élève est conçue pour être simple, motivante et centrée sur l'apprentissage.

### Navigation (Menu latéral Élève)

| Menu | Page |
|---|---|
| 📊 Tableau de bord | Vue d'ensemble personnalisée |
| 📚 Cours | Mes matières |
| 📖 Leçons | Leçons accessibles |
| 📝 Notes | Mes résultats scolaires |
| 📅 Absences | Historique de présence |
| 🤖 Étudier avec Grady | IA pédagogique |
| 🔔 Notifications | Mes alertes |
| 💬 Messagerie | Messages internes |
| 📆 Calendrier | Calendrier scolaire |
| 👤 Profil | Mon profil |
| 💡 Aide | Centre d'aide |

---

### 7.1 Tableau de Bord Élève

**Fonctionnalités :**

#### Statistiques personnelles
- **Moyenne générale** (calculée sur toutes les notes)
- **Matières suivies** (nombre de cours)
- **Leçons disponibles** (nombre de leçons publiées)
- **Taux de présence** (en %)

#### Carte "Étudier avec Grady"
Raccourci rapide vers l'IA Gradie avec un design violet/violet foncé et une icône d'étincelles. Cliquable pour accéder directement à l'IA.

#### Mes dernières notes
Affichage des notes les plus récentes avec le nom de la matière, la note, et un indicateur de performance.

#### Devoirs à rendre
Liste des devoirs avec dates de remise.

#### Prochaines leçons
Accès rapide aux dernières leçons publiées.

---

### 7.2 Mes Cours

**URL interne :** `student-courses`

**Fonctionnalités :**

- Liste de toutes les matières de la classe de l'élève
- Pour chaque cours : nom, professeur, description
- Accès aux leçons associées

---

### 7.3 Leçons

**URL interne :** `student-lessons`

**Fonctionnalités :**

- Liste de toutes les leçons publiées dans les cours de l'élève
- Pour chaque leçon : titre, contenu, date de publication
- **Téléchargement de fichiers** joints si disponibles

---

### 7.4 Notes (Élève)

**URL interne :** `student-grades`

**Fonctionnalités :**

- Vue de toutes les notes de l'élève, par trimestre et par matière
- Calcul de la **moyenne par trimestre**
- Calcul de la **moyenne générale**
- Commentaires des professeurs
- Affichage en tableau avec pourcentage et indicateur de performance (couleur verte / orange / rouge)

---

### 7.5 Absences (Élève)

**URL interne :** `student-attendance`

**Fonctionnalités :**

- Historique complet des absences et présences de l'élève
- Tri par date
- Motifs d'absence affichés
- Statistiques : taux de présence, nombre de jours absents, nombre de retards

---

### 7.6 Étudier avec Grady (IA)

**URL interne :** `student-ai`

Accès complet à l'assistant IA Gradie. Voir la section [9.3 IA Gradie](#93-ia-gradie).

---

### 7.7 Notifications (Élève)

**URL interne :** `student-notifications`

**Fonctionnalités :**

- Liste de toutes les notifications reçues (de l'école, de l'admin, des professeurs)
- Badge de compteur sur l'icône de cloche (temps réel)
- Marquer comme lu
- Notifications colorées par type (INFO, GRADE, CONFERENCE, etc.)

---

## 8. Interface Parent

L'interface parent permet de suivre la scolarité de son/ses enfant(s).

### Navigation (Menu latéral Parent)

| Menu | Page |
|---|---|
| 📊 Tableau de bord | Vue des enfants |
| 📊 Suivi scolaire | Notes & résultats |
| 💳 Paiements | Suivi des paiements |
| 🔔 Notifications | Mes alertes |
| 💬 Messagerie | Communication école |
| 👤 Profil | Mon profil |
| 💡 Aide | Centre d'aide |

---

### 8.1 Tableau de Bord Parent

**Fonctionnalités :**

#### Profil des enfants liés
Affichage des enfants liés au compte parent (via le code parent). Pour chaque enfant :
- Photo et nom
- Classe
- Moyenne générale
- Taux de présence

#### Résumé rapide
- Dernières notes des enfants
- Prochains devoirs
- Alertes d'absence récentes

#### Raccourci Messagerie
Deux boutons **"Envoyer un message"** (administrateur et professeurs) redirigent directement vers la messagerie interne pour faciliter la communication.

---

### 8.2 Suivi Scolaire

**URL interne :** `parent-grades`

**Fonctionnalités :**

- Vue des notes de chaque enfant lié
- Filtre par trimestre
- Affichage par matière avec note, note max et pourcentage
- Commentaires des professeurs
- Moyenne générale calculée

---

### 8.3 Paiements (Parent)

**URL interne :** `parent-payments`

**Fonctionnalités :**

- Liste des paiements effectués pour chaque enfant
- Statut de chaque paiement (payé, en attente, en retard)
- Montant, mois et méthode de paiement
- Solde dû

---

### 8.4 Notifications (Parent)

**URL interne :** `parent-notifications`

**Fonctionnalités :**

- Toutes les notifications de l'école (annonces, visioconférences, alertes)
- Badge de compteur en temps réel
- Marquer comme lu

---

## 9. Fonctionnalités Transversales

Ces fonctionnalités sont accessibles par plusieurs rôles.

---

### 9.1 Messagerie Interne

**URL interne :** `messages`  
**Accessible par :** Tous les rôles

**Fonctionnalités :**

#### Interface de messagerie
- Liste des conversations à gauche
- Vue du fil de messages à droite
- Champ de saisie et bouton d'envoi

#### Envoi de messages
- Sélection d'un destinataire parmi tous les utilisateurs de l'école
- Saisie du message
- Envoi instantané

#### Compteur de messages non lus
- Badge bleu sur l'icône de messagerie dans la barre supérieure
- Mis à jour automatiquement toutes les **15 secondes** via polling

#### Sécurité
Les messages sont filtrés par `schoolId` : les utilisateurs ne peuvent communiquer qu'avec des membres de la même école.

---

### 9.2 Calendrier Scolaire

**URL interne :** `calendar`  
**Accessible par :** Tous les rôles

**Fonctionnalités :**

- Calendrier mensuel visuel
- Affichage des événements scolaires
- Navigation entre les mois
- Création d'événements (Admin)

---

### 9.3 IA Gradie

**URL interne :** `admin-ai` / `teacher-ai` / `student-ai`  
**Accessible par :** Tous les rôles

Gradie est l'assistant IA intégré à GradeUp, alimenté par un modèle de langage avancé.

#### Interface
- Panneau de chat avec historique de conversation
- Zone de saisie avec bouton d'envoi
- Avatar distinctif pour Gradie (icône Bot)
- Rendu Markdown des réponses

#### Rendu Markdown des réponses
Les réponses de Gradie supportent le formatage complet :
- **Gras** (`**texte**`)
- *Italique* (`*texte*`)
- `Code inline` (`` `code` ``)
- Titres (`#`, `##`, `###`)
- Listes à puces (`-`, `*`)
- Listes numérotées (`1.`, `2.`)
- Séparateurs horizontaux (`---`)

#### Prompts suggérés (au démarrage)
- "Comment améliorer la moyenne de mes élèves ?"
- "Donne-moi des conseils pédagogiques"
- "Quels sont les élèves en difficulté ?"
- "Aide-moi à préparer un cours"

#### Historique persistant
Les conversations sont sauvegardées en base de données. Possibilité de créer une nouvelle conversation ou de reprendre une conversation existante.

#### Effacement de l'historique
Bouton pour effacer le fil de conversation actuel.

#### Upload de documents (pour analyse)
Possibilité d'uploader des documents (PDF, images) pour que Gradie les analyse.

#### Contextualisation
Gradie connaît le contexte de l'école et de l'utilisateur (rôle, matières, élèves) pour fournir des réponses pertinentes.

---

### 9.4 Profil Utilisateur

**URL interne :** `profile`  
**Accessible par :** Tous les rôles

**Fonctionnalités :**

- Affichage des informations du profil
- Modification du **nom complet**
- Modification du **mot de passe**
- Upload / changement de **photo de profil**
- Affichage du **code parent** (pour les élèves — à partager avec les parents)
- Informations sur l'école
- Badge de rôle coloré

---

### 9.5 Centre d'Aide

**URL interne :** `help`  
**Accessible par :** Tous les rôles

**Fonctionnalités :**

- FAQ organisée par catégories
- Questions/réponses fréquentes selon le rôle
- Guide de démarrage rapide
- Contact / Support

---

### 9.6 Notifications en Temps Réel

**Technologie :** Server-Sent Events (SSE) + Web Push API

Le système de notification fonctionne sur deux niveaux :

#### 1. Notifications en temps réel (SSE)
Lors de la connexion, chaque utilisateur s'abonne à un flux SSE personnalisé. Toute nouvelle notification est reçue instantanément et affichée en tant que **toast animé** (6 secondes) avec :
- Icône contextuelle (🔔 INFO, 🎥 CONFÉRENCE, 💬 MESSAGE, 🏫 CLASSE, 🆔 CARTE, 👤 PROFIL, 📝 NOTE)
- Titre et message
- Animation de rebond sur l'icône

#### 2. Notifications Push (PWA)
Sur HTTPS, l'application enregistre une subscription Web Push. Les notifications sont envoyées même lorsque l'application est fermée.

#### Badge de compteur
Le compteur dans la barre supérieure est mis à jour automatiquement. Un événement custom (`gradeup-notification-read`) permet de décrémenter le compteur quand une notification est lue.

---

### 9.7 Palette de Commandes

**Raccourci :** `Ctrl + K`  
**Accessible par :** Tous les rôles

Une palette de commandes flottante permet de naviguer rapidement vers n'importe quelle section de l'application en tapant des mots-clés.

---

### 9.8 Mode Sombre / Clair

**Accessible par :** Tous les rôles

Bouton dans la barre supérieure (Lune / Soleil) pour basculer entre le mode sombre et le mode clair. Le choix est persisté via `next-themes`.

---

## 10. API Backend

Toutes les routes API sont situées dans `src/app/api/`. Elles utilisent le **App Router de Next.js** (format `route.ts`).

### Routes principales

| Endpoint | Méthodes | Description |
|---|---|---|
| `/api/auth/login` | POST | Connexion utilisateur ou admin |
| `/api/auth/register` | POST | Créer une école ou rejoindre une école |
| `/api/users` | GET, POST, PATCH, DELETE | CRUD utilisateurs (avec filtres `role`, `parentId`, `classId`, `search`) |
| `/api/users/cards` | POST | Génération d'IDs de cartes |
| `/api/classes` | GET, POST, PATCH, DELETE | CRUD classes |
| `/api/courses` | GET, POST, PATCH, DELETE | CRUD cours (filtre `teacherId`) |
| `/api/lessons` | GET, POST, PATCH, DELETE | CRUD leçons |
| `/api/grades` | GET, POST, PATCH, DELETE | CRUD notes |
| `/api/homework` | GET, POST, PATCH, DELETE | CRUD devoirs |
| `/api/attendance` | GET, POST | Appel et historique présences |
| `/api/payments` | GET, POST, PATCH, DELETE | CRUD paiements |
| `/api/messages` | GET, POST | Messagerie |
| `/api/messages/unread-count` | GET | Compteur de messages non lus |
| `/api/notifications` | GET, POST, PATCH | Notifications |
| `/api/notifications/sse` | GET | Flux SSE temps réel |
| `/api/conferences` | GET, POST, DELETE | Visioconférences |
| `/api/stats` | GET | Statistiques globales |
| `/api/report-cards` | GET, POST, DELETE | CRUD bulletins |
| `/api/report-cards/stats` | GET | Statistiques d'utilisation bulletins |
| `/api/report-cards/archive` | GET | Archive des bulletins |
| `/api/courses-with-points` | GET, POST | Matières pour bulletins |
| `/api/ai` | POST | Chat avec l'IA Gradie |
| `/api/invite-code` | GET, POST | Code invitation école |
| `/api/parent-code` | GET | Code parent d'un élève |
| `/api/config` | GET, PATCH | Configuration école |
| `/api/schools/[id]` | GET, PATCH | Infos école |
| `/api/user` | GET, PATCH | Profil utilisateur courant |
| `/api/payments/pawapay` | POST | Initiation paiement PawaPay |

---

## 11. Sécurité & Confidentialité

### Isolation des données
Toutes les requêtes API filtrent par `schoolId`. Un utilisateur ne peut **jamais** accéder aux données d'une autre école.

### Isolation parent-enfant
La route `/api/users` accepte un paramètre `parentId` pour filtrer les élèves : un parent ne voit que ses propres enfants (liés par le code parent).

### Mots de passe
Les mots de passe sont **hachés** avant stockage en base de données.

### Validation côté serveur
Toutes les entrées utilisateur sont validées côté serveur avant persistance.

### Sessions
La session est gérée côté client (Zustand + localStorage). Aucun cookie de session n'est utilisé.

### Codes uniques
- **Code école** : Généré aléatoirement, unique, format `ECOLE-XXXXXX`
- **Code parent** : Généré aléatoirement par élève, utilisé uniquement pour la liaison parent-enfant
- **CardId** : Identifiant unique de carte d'identité, lié au QR code

---

## 12. Application Mobile (PWA)

GradeUp est une **Progressive Web App (PWA)** installable directement depuis le navigateur, sans passer par les stores.

### Installation sur Android
1. Ouvrir GradeUp dans **Chrome**
2. Cliquer sur le bouton **"Télécharger sur Android"** dans le menu latéral
3. Une bannière d'installation apparaît → appuyer sur **"Installer"**

Si la bannière n'apparaît pas :
- Menu Chrome (⋮) → **"Ajouter à l'écran d'accueil"**

### Installation sur iOS (Safari)
1. Ouvrir GradeUp dans **Safari**
2. Appuyer sur l'icône **Partager** (carré avec flèche vers le haut)
3. Sélectionner **"Sur l'écran d'accueil"**

### Fonctionnalités PWA
- **Notifications Push** : Reçues même quand l'app est fermée (HTTPS requis)
- **Mode hors-ligne** : Interface accessible même sans connexion (cache Service Worker)
- **Icône sur l'écran d'accueil** : Ressemble à une app native
- **Plein écran** : Interface sans barre d'adresse du navigateur

---

## Annexe : Structure des Fichiers Principaux

```
src/
├── app/
│   ├── page.tsx                    # Point d'entrée, PageRouter
│   ├── layout.tsx                  # Layout racine (ThemeProvider, Toaster)
│   └── api/
│       ├── auth/login/route.ts
│       ├── auth/register/route.ts
│       ├── users/route.ts
│       ├── courses/route.ts
│       ├── lessons/route.ts
│       ├── grades/route.ts
│       ├── homework/route.ts
│       ├── attendance/route.ts
│       ├── payments/route.ts
│       ├── messages/route.ts
│       ├── notifications/route.ts
│       ├── conferences/route.ts
│       ├── report-cards/route.ts
│       ├── ai/route.ts
│       └── stats/route.ts
├── components/
│   └── gradeup/
│       ├── app-layout.tsx          # Layout principal avec sidebar
│       ├── auth-page.tsx           # Connexion / Inscription
│       ├── admin-dashboard.tsx     # Tableau de bord admin
│       ├── admin-users.tsx         # Gestion utilisateurs
│       ├── admin-classes.tsx       # Gestion classes
│       ├── admin-payments.tsx      # Gestion paiements
│       ├── admin-cards.tsx         # Cartes d'identité
│       ├── admin-config.tsx        # Configuration école
│       ├── admin-reports.tsx       # Bulletins officiels
│       ├── admin-notifications.tsx # Notifications
│       ├── admin-courses.tsx       # Cours (admin)
│       ├── admin-conferences.tsx   # Visioconférences
│       ├── admin-ai.tsx            # IA (admin)
│       ├── teacher-dashboard.tsx   # Tableau de bord prof
│       ├── teacher-courses.tsx     # Cours (prof)
│       ├── teacher-lessons.tsx     # Leçons
│       ├── teacher-grades.tsx      # Notes
│       ├── teacher-homework.tsx    # Devoirs
│       ├── teacher-attendance.tsx  # Appel
│       ├── teacher-ai.tsx          # IA (prof)
│       ├── student-dashboard.tsx   # Tableau de bord élève
│       ├── student-courses.tsx     # Cours (élève)
│       ├── student-lessons.tsx     # Leçons (élève)
│       ├── student-grades.tsx      # Notes (élève)
│       ├── student-attendance.tsx  # Absences (élève)
│       ├── student-ai.tsx          # IA (élève)
│       ├── student-notifications.tsx
│       ├── student-payments.tsx
│       ├── parent-dashboard.tsx    # Tableau de bord parent
│       ├── parent-grades.tsx       # Notes (parent)
│       ├── parent-payments.tsx     # Paiements (parent)
│       ├── parent-notifications.tsx
│       ├── ai-chat.tsx             # Composant chat IA partagé
│       ├── chat-page.tsx           # Messagerie interne
│       ├── school-calendar.tsx     # Calendrier
│       ├── profile-page.tsx        # Profil
│       ├── help-page.tsx           # Aide
│       ├── command-palette.tsx     # Palette Ctrl+K
│       ├── charts-widget.tsx       # Graphiques
│       ├── activity-feed.tsx       # Fil d'activité
│       └── welcome-banner.tsx      # Bannière d'accueil
├── lib/
│   ├── store.ts                    # Store Zustand global
│   ├── types.ts                    # Types TypeScript
│   └── prisma.ts                   # Client Prisma
└── services/
    └── notifications/
        ├── notificationListener.ts # Abonnement SSE
        └── pushRegistration.ts     # Inscription Web Push
```

---

*Documentation générée pour GradeUp v1.0 — © Axion Labs Technologies*
