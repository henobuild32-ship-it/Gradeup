'use client';

import React from 'react';
import { useAppStore } from '@/lib/store';
import type { UserRole } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Lightbulb,
  Keyboard,
  MessageSquare,
  CalendarDays,
  User,
  Moon,
  Sun,
  Search,
  Bell,
  GraduationCap,
  Users,
  CreditCard,
  BookOpen,
  BarChart3,
  School,
  Shield,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Administrateur',
  TEACHER: 'Professeur',
  STUDENT: 'Élève',
  PARENT: 'Parent',
};

const roleColors: Record<UserRole, string> = {
  ADMIN: 'from-blue-600 to-blue-500',
  TEACHER: 'from-emerald-600 to-emerald-500',
  STUDENT: 'from-violet-600 to-violet-500',
  PARENT: 'from-amber-600 to-amber-500',
};

const shortcuts = [
  { key: 'Ctrl + K', description: 'Ouvrir la palette de commandes' },
  { key: 'Ctrl + /', description: 'Aller à la page d\'aide' },
];

const generalTips = [
  {
    icon: Sun,
    title: 'Mode sombre',
    description: 'Utilisez le bouton ☀️/🌙 dans l\'en-tête pour basculer entre le mode clair et sombre.',
  },
  {
    icon: Search,
    title: 'Recherche rapide',
    description: 'Appuyez sur Ctrl+K pour rechercher et naviguer rapidement vers n\'importe quelle page.',
  },
  {
    icon: Bell,
    title: 'Notifications',
    description: 'L\'icône de cloche dans l\'en-tête affiche le nombre de messages non lus en temps réel.',
  },
  {
    icon: MessageSquare,
    title: 'Messagerie',
    description: 'Communiquez avec les autres membres de l\'école via la messagerie intégrée.',
  },
  {
    icon: CalendarDays,
    title: 'Calendrier scolaire',
    description: 'Consultez le calendrier pour voir les devoirs à rendre et les échéances de paiement.',
  },
  {
    icon: User,
    title: 'Mon profil',
    description: 'Modifiez vos informations personnelles et changez votre mot de passe depuis la page Profil.',
  },
];

const adminTips = [
  {
    icon: Shield,
    title: 'Code école',
    description: 'Votre code école unique permet aux membres de rejoindre votre école lors de l\'inscription.',
  },
  {
    icon: Users,
    title: 'Gestion des utilisateurs',
    description: 'Activez ou désactivez les comptes utilisateurs depuis la page Utilisateurs.',
  },
  {
    icon: School,
    title: 'Classes et cours',
    description: 'Créez des classes et attribuez des professeurs pour organiser votre école.',
  },
  {
    icon: CreditCard,
    title: 'Suivi des paiements',
    description: 'Gérez les paiements des élèves et suivez les paiements en attente.',
  },
];

const teacherTips = [
  {
    icon: BookOpen,
    title: 'Cours et leçons',
    description: 'Créez des cours, ajoutez des leçons avec du contenu pédagogique pour vos élèves.',
  },
  {
    icon: GraduationCap,
    title: 'Saisie des notes',
    description: 'Entrez les notes de vos élèves par trimestre avec des commentaires personnalisés.',
  },
  {
    icon: BarChart3,
    title: 'Suivi des absences',
    description: 'Enregistrez les présences et absences de vos élèves au quotidien.',
  },
];

const studentTips = [
  {
    icon: GraduationCap,
    title: 'Code parent',
    description: 'Générez votre code parent depuis le tableau de bord pour permettre à vos parents de vous suivre.',
  },
  {
    icon: BarChart3,
    title: 'Consultez vos notes',
    description: 'Suivez vos moyennes par trimestre et identifiez les matières à améliorer.',
  },
  {
    icon: CreditCard,
    title: 'Paiements',
    description: 'Vérifiez le statut de vos paiements scolaires depuis la section Paiements.',
  },
];

const parentTips = [
  {
    icon: BarChart3,
    title: 'Suivi scolaire',
    description: 'Consultez les notes et les performances de votre enfant en temps réel.',
  },
  {
    icon: CreditCard,
    title: 'Paiements',
    description: 'Suivez les paiements scolaires de votre enfant et leur statut.',
  },
];

export default function HelpPage() {
  const user = useAppStore((s) => s.user);

  if (!user) return null;

  const role = user.role as UserRole;

  const getRoleTips = () => {
    switch (role) {
      case 'ADMIN': return adminTips;
      case 'TEACHER': return teacherTips;
      case 'STUDENT': return studentTips;
      case 'PARENT': return parentTips;
      default: return [];
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Page Header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 p-6 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-40" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur-sm">
              <Lightbulb className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Centre d&apos;aide</h1>
              <p className="text-blue-100 text-sm">Conseils et raccourcis pour utiliser GradeUp</p>
            </div>
          </div>
          <Badge className={`mt-2 bg-gradient-to-r ${roleColors[role]} text-white border-0`}>
            {roleLabels[role]}
          </Badge>
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30">
              <Keyboard className="h-4 w-4 text-blue-600" />
            </div>
            Raccourcis clavier
          </CardTitle>
          <CardDescription>Gagnez du temps avec ces raccourcis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {shortcuts.map((shortcut) => (
              <div key={shortcut.key} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                <span className="text-sm text-foreground">{shortcut.description}</span>
                <kbd className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono text-muted-foreground bg-background rounded-lg border border-border shadow-sm">
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Role-specific Tips */}
      <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
              <Sparkles className="h-4 w-4 text-emerald-600" />
            </div>
            Conseils pour {roleLabels[role].toLowerCase()}s
          </CardTitle>
          <CardDescription>Funcionalités utiles pour votre rôle</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {getRoleTips().map((tip, index) => {
              const Icon = tip.icon;
              return (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 rounded-xl hover:bg-accent/30 transition-all duration-200 group cursor-default"
                >
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${roleColors[role]} text-white shadow-sm shrink-0 group-hover:scale-105 transition-transform`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{tip.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{tip.description}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0 mt-0.5" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* General Tips */}
      <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30">
              <Lightbulb className="h-4 w-4 text-amber-600" />
            </div>
            Astuces générales
          </CardTitle>
          <CardDescription>Trucs et astuces pour tous les utilisateurs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {generalTips.map((tip, index) => {
              const Icon = tip.icon;
              return (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 rounded-xl hover:bg-accent/30 transition-all duration-200 group cursor-default"
                >
                  <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-600 shrink-0 group-hover:scale-105 transition-transform">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{tip.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{tip.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* About Section */}
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg">
        <div className="bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 p-6 text-white">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <img src="/logo-gradeup.png" alt="GradeUp" className="w-14 h-14 rounded-xl object-contain drop-shadow-lg" />
            <div className="text-center sm:text-left">
              <h3 className="text-lg font-bold">GradeUp</h3>
              <p className="text-slate-300 text-sm mt-0.5">Plateforme de gestion scolaire intelligente</p>
              <p className="text-slate-400 text-xs mt-1">Version 2.0 • © GradeUp – Créé par Axions Labs</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
