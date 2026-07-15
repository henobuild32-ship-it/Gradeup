'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import type { PageView, UserRole } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTheme } from 'next-themes';
import CommandPalette from './command-palette';
import { toast } from 'sonner';
import { subscribeToNotifications } from '@/services/notifications/notificationListener';
import { registerPushNotifications } from '@/services/notifications/pushRegistration';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Settings,
  BarChart3,
  Bell,
  BookOpen,
  FileText,
  ClipboardList,
  ClipboardCheck,
  Calendar,
  Bot,
  LogOut,
  Menu,
  ChevronLeft,
  User,
  MessageSquare,
  CalendarDays,
  ChevronDown,
  School,
  Sun,
  Moon,
  Lightbulb,
  Video,
  Library,
  Smartphone,
  Apple,
  IdCard,
  DollarSign,
  GraduationCap,
  ScrollText,
  Zap,
  Check,
} from 'lucide-react';

interface NavItem {
  label: string;
  page: PageView;
  icon: React.ElementType;
  emoji: string;
}

const navItemsByRole: Record<UserRole, NavItem[]> = {
  ADMIN: [
    { label: 'Tableau de bord', page: 'admin-dashboard', icon: LayoutDashboard, emoji: '📊' },
    { label: 'Utilisateurs', page: 'admin-users', icon: Users, emoji: '👥' },
    { label: 'Classes', page: 'admin-classes', icon: School, emoji: '🏫' },
    { label: 'Paiements', page: 'admin-payments', icon: CreditCard, emoji: '💳' },
    { label: 'Frais scolaires', page: 'admin-tuition', icon: DollarSign, emoji: '💰' },
    { label: 'Cartes Élèves', page: 'admin-cards', icon: IdCard, emoji: '🆔' },
    { label: 'Configuration', page: 'admin-config', icon: Settings, emoji: '⚙️' },
    { label: 'Présence', page: 'admin-presence', icon: ClipboardCheck, emoji: '✅' },
    { label: 'Rapports', page: 'admin-reports', icon: BarChart3, emoji: '📈' },
    { label: 'Notifications', page: 'admin-notifications', icon: Bell, emoji: '🔔' },
    { label: 'Cours', page: 'admin-courses', icon: BookOpen, emoji: '📚' },
    { label: 'Emploi du temps', page: 'admin-schedules', icon: CalendarDays, emoji: '🗓️' },
    { label: 'Bulletins Sync', page: 'auto-report-sync', icon: Zap, emoji: '⚡' },
    { label: 'Cahier de Cotation', page: 'cahier-cotation', icon: ClipboardList, emoji: '📖' },
    { label: 'IA Gradie', page: 'admin-ai', icon: Bot, emoji: '🤖' },
    { label: 'Visioconférences', page: 'meetings', icon: Video, emoji: '🎥' },
    { label: 'Bibliothèque', page: 'library', icon: Library, emoji: '📚' },
    { label: 'Fin du cursus', page: 'admin-end-of-year', icon: GraduationCap, emoji: '🎓' },
    { label: 'Messagerie', page: 'messages', icon: MessageSquare, emoji: '💬' },
    { label: 'Calendrier', page: 'calendar', icon: CalendarDays, emoji: '📆' },
    { label: 'Profil', page: 'profile', icon: User, emoji: '👤' },
    { label: 'Aide', page: 'help', icon: Lightbulb, emoji: '💡' },
  ],
  TEACHER: [
    { label: 'Tableau de bord', page: 'teacher-dashboard', icon: LayoutDashboard, emoji: '📊' },
    { label: 'Cours', page: 'teacher-courses', icon: BookOpen, emoji: '📚' },
    { label: 'Leçons', page: 'teacher-lessons', icon: FileText, emoji: '📖' },
    { label: 'Notes', page: 'teacher-grades', icon: ClipboardList, emoji: '📝' },
    { label: 'Devoirs', page: 'teacher-homework', icon: ClipboardCheck, emoji: '📋' },
    { label: 'Absences', page: 'teacher-attendance', icon: Calendar, emoji: '📅' },
    { label: 'IA Gradie', page: 'teacher-ai', icon: Bot, emoji: '🤖' },
    { label: 'Visioconférences', page: 'meetings', icon: Video, emoji: '🎥' },
    { label: 'Bibliothèque', page: 'library', icon: Library, emoji: '📚' },
    { label: 'Rapports', page: 'teacher-reports', icon: ScrollText, emoji: '📄' },
    { label: 'Bulletins Sync', page: 'auto-report-sync', icon: Zap, emoji: '⚡' },
    { label: 'Cahier de Cotation', page: 'cahier-cotation', icon: ClipboardList, emoji: '📖' },
    { label: 'Fin du cursus', page: 'teacher-end-of-year', icon: GraduationCap, emoji: '🎓' },
    { label: 'Messagerie', page: 'messages', icon: MessageSquare, emoji: '💬' },
    { label: 'Calendrier', page: 'calendar', icon: CalendarDays, emoji: '📆' },
    { label: 'Profil', page: 'profile', icon: User, emoji: '👤' },
    { label: 'Aide', page: 'help', icon: Lightbulb, emoji: '💡' },
  ],
  STUDENT: [
    { label: 'Tableau de bord', page: 'student-dashboard', icon: LayoutDashboard, emoji: '📊' },
    { label: 'Cours', page: 'student-courses', icon: BookOpen, emoji: '📚' },
    { label: 'Leçons', page: 'student-lessons', icon: FileText, emoji: '📖' },
    { label: 'Notes', page: 'student-grades', icon: ClipboardList, emoji: '📝' },
    { label: 'Devoirs', page: 'student-homework', icon: ClipboardCheck, emoji: '📋' },
    { label: 'Absences', page: 'student-attendance', icon: Calendar, emoji: '📅' },
    { label: 'Étudier avec Grady', page: 'student-ai', icon: Bot, emoji: '🤖' },
    { label: 'Visioconférences', page: 'meetings', icon: Video, emoji: '🎥' },
    { label: 'Bibliothèque', page: 'library', icon: Library, emoji: '📚' },
    { label: 'Notifications', page: 'student-notifications', icon: Bell, emoji: '🔔' },
    { label: 'Messagerie', page: 'messages', icon: MessageSquare, emoji: '💬' },
    { label: 'Calendrier', page: 'calendar', icon: CalendarDays, emoji: '📆' },
    { label: 'Profil', page: 'profile', icon: User, emoji: '👤' },
    { label: 'Aide', page: 'help', icon: Lightbulb, emoji: '💡' },
  ],
  PARENT: [
    { label: 'Tableau de bord', page: 'parent-dashboard', icon: LayoutDashboard, emoji: '📊' },
    { label: 'Suivi scolaire', page: 'parent-grades', icon: BarChart3, emoji: '📊' },
    { label: 'Paiements', page: 'parent-payments', icon: CreditCard, emoji: '💳' },
    { label: 'IA Gradie', page: 'parent-ai', icon: Bot, emoji: '🤖' },
    { label: 'Visioconférences', page: 'meetings', icon: Video, emoji: '🎥' },
    { label: 'Bibliothèque', page: 'library', icon: Library, emoji: '📚' },
    { label: 'Notifications', page: 'parent-notifications', icon: Bell, emoji: '🔔' },
    { label: 'Messagerie', page: 'messages', icon: MessageSquare, emoji: '💬' },
    { label: 'Profil', page: 'profile', icon: User, emoji: '👤' },
    { label: 'Aide', page: 'help', icon: Lightbulb, emoji: '💡' },
  ],
};

const bottomTabsByRole: Record<UserRole, { label: string; page: PageView; icon: React.ElementType }[]> = {
  ADMIN: [
    { label: 'Accueil', page: 'admin-dashboard', icon: LayoutDashboard },
    { label: 'Classes', page: 'admin-classes', icon: School },
    { label: 'Grady IA', page: 'admin-ai', icon: Bot },
    { label: 'Frais', page: 'admin-tuition', icon: DollarSign },
    { label: 'Profil', page: 'profile', icon: User },
  ],
  TEACHER: [
    { label: 'Accueil', page: 'teacher-dashboard', icon: LayoutDashboard },
    { label: 'Cours', page: 'teacher-courses', icon: BookOpen },
    { label: 'Grady IA', page: 'teacher-ai', icon: Bot },
    { label: 'Rapports', page: 'teacher-reports', icon: ScrollText },
    { label: 'Profil', page: 'profile', icon: User },
  ],
  STUDENT: [
    { label: 'Accueil', page: 'student-dashboard', icon: LayoutDashboard },
    { label: 'Cours', page: 'student-courses', icon: BookOpen },
    { label: 'Grady IA', page: 'student-ai', icon: Bot },
    { label: 'Notifs', page: 'student-notifications', icon: Bell },
    { label: 'Profil', page: 'profile', icon: User },
  ],
  PARENT: [
    { label: 'Accueil', page: 'parent-dashboard', icon: LayoutDashboard },
    { label: 'Suivi', page: 'parent-grades', icon: BarChart3 },
    { label: 'Grady IA', page: 'parent-ai', icon: Bot },
    { label: 'Paiements', page: 'parent-payments', icon: CreditCard },
    { label: 'Profil', page: 'profile', icon: User },
  ],
};

const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Administrateur',
  TEACHER: 'Professeur',
  STUDENT: 'Élève',
  PARENT: 'Parent',
};

const roleBadgeColors: Record<UserRole, string> = {
  ADMIN: 'bg-blue-100 text-blue-700',
  TEACHER: 'bg-emerald-100 text-emerald-700',
  STUDENT: 'bg-violet-100 text-violet-700',
  PARENT: 'bg-amber-100 text-amber-700',
};

const pageTitles: Record<PageView, string> = {
  auth: 'Connexion',
  register: 'Inscription',
  'admin-dashboard': 'Tableau de bord',
  'admin-users': 'Utilisateurs',
  'admin-classes': 'Classes',
  'admin-payments': 'Paiements',
  'admin-config': 'Configuration',
  'admin-reports': 'Rapports',
  'admin-notifications': 'Notifications',
  'admin-conferences': 'Visioconférences',
  'meetings': 'Visioconférences Grada Vio',
  'meeting-room': 'Réunion en cours',
  'library': 'Bibliothèque Numérique',
  'admin-cards': 'Cartes d\'identité',
  'admin-courses': 'Cours',
  'admin-ai': 'IA Gradie',
  'admin-tuition': 'Frais scolaires',
  'admin-presence': 'Module de Présence',
  'admin-schedules': 'Gestion des Emplois du Temps',
  'auto-report-sync': 'Bulletins Synchronisés',
  'cahier-cotation': 'Cahier de Cotation RDC',
  'admin-end-of-year': 'Fin du cursus',
  'teacher-dashboard': 'Tableau de bord',
  'teacher-courses': 'Cours',
  'teacher-lessons': 'Leçons',
  'teacher-grades': 'Notes',
  'teacher-homework': 'Devoirs',
  'teacher-attendance': 'Absences',
  'teacher-ai': 'IA Gradie',
  'teacher-reports': 'Rapports',
  'teacher-end-of-year': 'Fin du cursus',
  'student-dashboard': 'Tableau de bord',
  'student-courses': 'Cours',
  'student-lessons': 'Leçons',
  'student-grades': 'Notes',
  'student-attendance': 'Absences',
  'student-payments': 'Paiements',
  'student-ai': 'IA Gradie',
  'student-homework': 'Devoirs',
  'student-notifications': 'Notifications',
  'parent-dashboard': 'Tableau de bord',
  'parent-grades': 'Suivi scolaire',
  'parent-payments': 'Paiements',
  'parent-notifications': 'Notifications',
  'parent-ai': 'IA Gradie',
  'profile': 'Profil',
  'messages': 'Messagerie',
  'calendar': 'Calendrier',
  'help': 'Centre d\'aide',
};

interface AppLayoutProps {
  children: React.ReactNode;
}

function SidebarContent({
  collapsed,
  user,
  currentPage,
  onNavigate,
  onLogout,
}: {
  collapsed?: boolean;
  user: { fullName: string; role: UserRole; photoUrl?: string; isTitulaire?: boolean };
  currentPage: PageView;
  onNavigate: (page: PageView) => void;
  onLogout: () => void;
}) {
  let navItems = navItemsByRole[user.role] || [];
  if (user.role === 'TEACHER' && !user.isTitulaire) {
    navItems = navItems.filter(item => item.page !== 'teacher-reports' && item.page !== 'auto-report-sync');
  }
  const initials = (user.fullName || '')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0] || '')
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  const { isInstallable, isAppInstalled, installPWA } = usePWAInstall();

  if (collapsed) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-b from-sidebar via-sidebar to-sidebar/95 text-sidebar-foreground shadow-lg shadow-black/10">
        {/* Brand - Collapsed */}
        <div className="flex flex-col items-center justify-center h-16 px-2 gap-1.5 shrink-0">
          <img src="/logo-gradeup.png" alt="GradeUp" className="w-9 h-9 rounded-lg object-contain drop-shadow-md" />
          <div className="gradient-accent-line w-7" />
        </div>

        <Separator className="bg-sidebar-border" />

        {/* Scrollable Nav items - icons only */}
        <ScrollArea className="flex-1 py-2">
          <nav className="stagger-children flex flex-col items-center gap-1 px-2">
            {navItems.map((item) => {
              const isActive = currentPage === item.page;
              return (
                <Tooltip key={item.page}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onNavigate(item.page)}
                      className={`
                        flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:ring-offset-2
                        ${isActive
                          ? 'bg-gradient-to-br from-sidebar-primary/20 to-sidebar-primary/10 text-sidebar-accent-foreground shadow-sm ring-1 ring-sidebar-primary/30'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground hover:scale-105 hover:brightness-110'
                        }
                      `}
                    >
                      <item.icon className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="z-[200]">
                    {item.emoji} {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </nav>
        </ScrollArea>

        <Separator className="bg-sidebar-border" />

        {/* Logout */}
        <div className="p-2 flex justify-center shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onLogout}
                className="flex items-center justify-center w-9 h-9 rounded-lg text-sidebar-foreground/70 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 hover:scale-105"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="z-[200]">Déconnexion</TooltipContent>
          </Tooltip>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sidebar via-sidebar to-sidebar/95 text-sidebar-foreground shadow-lg shadow-black/10">
      {/* Brand - Expanded */}
      <div className="flex flex-col items-start gap-1.5 h-16 px-4 shrink-0 justify-center">
        <div className="flex items-center gap-3 w-full">
          <img src="/logo-gradeup.png" alt="GradeUp" className="w-9 h-9 rounded-lg object-contain drop-shadow-md shrink-0" />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-base font-bold tracking-tight text-sidebar-foreground">GradeUp</span>
            <span className="text-[10px] text-sidebar-foreground/50 truncate">
              {user.role === 'ADMIN' ? 'Administration' : roleLabels[user.role]}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 shrink-0 transition-all duration-200"
            onClick={() => onNavigate('auth' as PageView)}
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>
        <div className="gradient-accent-line w-full" />
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Scrollable Navigation */}
      <ScrollArea className="flex-1 py-3">
        <nav className="stagger-children flex flex-col gap-1 px-3">
          {navItems.map((item) => {
            const isActive = currentPage === item.page;
            return (
              <button
                key={item.page}
                onClick={() => onNavigate(item.page)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:ring-offset-2
                  ${isActive
                    ? 'bg-gradient-to-r from-sidebar-primary/20 to-sidebar-primary/10 text-sidebar-accent-foreground shadow-sm ring-1 ring-sidebar-primary/20'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground hover:brightness-110'
                  }
                `}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
        
        {/* PWA Download Buttons */}
        {!isAppInstalled && (
          <div className="px-4 mt-6 mb-2 flex flex-col gap-2">
            <div className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-1">
              Application Mobile
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start gap-2 text-xs bg-sidebar-accent/30 border-sidebar-border hover:bg-sidebar-accent/50"
              onClick={async () => {
                if (isInstallable) {
                  await installPWA();
                } else {
                  alert("Pour installer l'application sur Android, ouvrez le menu de votre navigateur Chrome et appuyez sur 'Ajouter à l'écran d'accueil'.");
                }
              }}
            >
              <Smartphone className="w-3.5 h-3.5 text-green-500" />
              Télécharger sur Android
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start gap-2 text-xs bg-sidebar-accent/30 border-sidebar-border hover:bg-sidebar-accent/50"
              onClick={() => {
                alert("Installation iOS: Apple ne permet pas l'installation automatique. Dans Safari, touchez l'icône Partager (carré avec flèche vers le haut) puis sélectionnez 'Sur l'écran d'accueil'.");
              }}
            >
              <Apple className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
              Télécharger sur iOS
            </Button>
          </div>
        )}
      </ScrollArea>

      <Separator className="bg-sidebar-border" />

      {/* User info - sticky bottom */}
      <div className="p-3 shrink-0">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/30 transition-all duration-200 hover:bg-sidebar-accent/40">
          <Avatar className="h-8 w-8 shrink-0 ring-2 ring-sidebar-primary/30">
            {user.photoUrl && <AvatarImage src={user.photoUrl} alt={user.fullName} />}
            <AvatarFallback className="text-xs bg-sidebar-primary text-sidebar-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-medium text-sidebar-foreground truncate">{user.fullName}</span>
            <span className="text-[10px] text-sidebar-foreground/50">{roleLabels[user.role]}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 text-sidebar-foreground/70 hover:text-red-400 hover:bg-red-500/10 justify-start gap-2 transition-all duration-200"
          onClick={onLogout}
        >
          <LogOut className="w-4 h-4" />
          <span className="text-xs">Déconnexion</span>
        </Button>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, currentPage, setCurrentPage, sidebarOpen, setSidebarOpen, setUser, logout } = useAppStore();
  const { isInstallable, isAppInstalled, installPWA } = usePWAInstall();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    // Avoid swiping when active inside textareas, inputs, or horizontal sliders
    const target = e.target as HTMLElement;
    if (
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('.no-swipe') ||
      target.closest('[role="slider"]')
    ) {
      return;
    }
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (touchStart === null || touchEnd === null) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isMobile && (isLeftSwipe || isRightSwipe)) {
      const getFilteredBottomTabs = (u: any) => {
        if (!u) return [];
        let tabs = bottomTabsByRole[u.role as UserRole] || [];
        if (u.role === 'TEACHER' && !u.isTitulaire) {
          tabs = tabs.filter(t => t.page !== 'teacher-reports');
        }
        return tabs;
      };
      const tabs = getFilteredBottomTabs(user);
      if (tabs.length > 0) {
        const currentIdx = tabs.findIndex((tab) => tab.page === currentPage);
        if (currentIdx !== -1) {
          if (isLeftSwipe && currentIdx < tabs.length - 1) {
            handleNavigate(tabs[currentIdx + 1].page);
          } else if (isRightSwipe && currentIdx > 0) {
            handleNavigate(tabs[currentIdx - 1].page);
          }
        }
      }
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  // Responsive device orientation and screen resize observer
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchUnreadNotifications = async () => {
    if (!user) return;
    try {
      const roleParam = user.role !== 'ADMIN' ? `&targetRole=${user.role}` : '';
      const res = await fetch(`/api/notifications?schoolId=${user.schoolId}${roleParam}`);
      if (res.ok) {
        const data = await res.json();
        const notifs = Array.isArray(data.notifications) ? data.notifications : [];
        const unread = notifs.filter((n: any) => !n.read).length;
        setUnreadNotificationsCount(unread);
      }
    } catch {
      // silently ignore
    }
  };

  // Real-time notifications SSE subscription
  useEffect(() => {
    if (!user) return;

    // Fetch initial count
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUnreadNotifications();

    // Register background PWA Web Push notifications (only on HTTPS)
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
      registerPushNotifications(user.id);
    }

    // Subscribe to SSE stream
    const unsubscribe = subscribeToNotifications({
      userId: user.id,
      role: user.role,
      schoolId: user.schoolId,
      onNotification: (notif) => {
        // Increment unread count
        setUnreadNotificationsCount((prev) => prev + 1);

        // Customize the emoji icon in premium toast
        let icon = '🔔';
        if (notif.type === 'CONFERENCE') icon = '🎥';
        else if (notif.type === 'MESSAGE') icon = '💬';
        else if (notif.type === 'CLASS') icon = '🏫';
        else if (notif.type === 'CARD') icon = '🆔';
        else if (notif.type === 'PROFILE') icon = '👤';
        else if (notif.type === 'GRADE') icon = '📝';

        // Show premium animated toast with Sonner
        toast(notif.title || 'Notification GradeUp', {
          description: notif.message,
          icon: <span className="text-lg animate-bounce">{icon}</span>,
          duration: 6000,
          className: 'bg-card border border-border shadow-2xl rounded-xl p-4',
        });
      },
    });

    // Custom Event Listener to decrement/refresh count when marked read in pages
    const handleEvents = () => {
      fetchUnreadNotifications();
    };
    window.addEventListener('gradeup-notification-read', handleEvents);
    window.addEventListener('gradeup-notification', handleEvents);

    return () => {
      unsubscribe();
      window.removeEventListener('gradeup-notification-read', handleEvents);
      window.removeEventListener('gradeup-notification', handleEvents);
    };
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // Fetch unread message count
  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      try {
        const res = await fetch(`/api/messages/unread-count?userId=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setUnreadMessages(data.unreadMessages || 0);
        }
      } catch {
        // silently ignore
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user) return null;

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = () => {
    setShowLogoutDialog(false);
    logout();
  };

  const handleNavigate = (page: PageView) => {
    setCurrentPage(page);
    // Close mobile sheet
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const initials = (user.fullName || '')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0] || '')
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  return (
    // ✅ Container principal: utilise h-dvh pour la hauteur dynamique du viewport
    <div className="flex h-dvh bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex shrink-0 transition-all duration-300 ${
          sidebarOpen ? 'w-60' : 'w-[60px]'
        }`}
      >
        {/* Animated gradient border on left edge of sidebar */}
        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-blue-500 via-indigo-500 to-purple-500 opacity-60 z-10" />
        <SidebarContent
          collapsed={!sidebarOpen}
          user={user}
          currentPage={currentPage}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen && isMobile} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0 bg-sidebar border-sidebar-border">
          <SheetHeader className="sr-only">
            <SheetTitle>Menu de navigation</SheetTitle>
          </SheetHeader>
          <SidebarContent
            user={user}
            currentPage={currentPage}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
          />
        </SheetContent>
      </Sheet>

      {/* Main Content Container - Flex column pour structure verticale */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <header 
          className="h-14 border-b bg-card/80 backdrop-blur-xl shrink-0 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          {isMobile ? (
            <div className="flex items-center justify-between w-full relative h-full">
              {/* Left Side: Hamburger */}
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-blue-50 hover:text-blue-600 transition-colors shrink-0 z-10"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>

              {/* Centered Large-style Title */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <h2 className="text-sm font-semibold text-foreground tracking-tight select-none">
                  {pageTitles[currentPage] || 'GradeUp'}
                </h2>
              </div>

              {/* Right Side: dropdown menu / profile */}
              <div className="flex items-center gap-2 z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center justify-center h-8 w-8 p-0 rounded-full hover:bg-muted transition-all duration-200">
                      <Avatar className="h-7 w-7 ring-2 ring-blue-100 transition-all duration-200">
                        {user.photoUrl && <AvatarImage src={user.photoUrl} alt={user.fullName} />}
                        <AvatarFallback className="text-[10px] bg-primary text-primary-foreground font-bold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{user.fullName}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${roleBadgeColors[user.role]}`}>
                            {roleLabels[user.role]}
                          </Badge>
                          {user.school && (
                            <span className="text-[10px] text-muted-foreground truncate">{user.school.name}</span>
                          )}
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleNavigate('profile')} className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Mon profil
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Déconnexion
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                {/* Desktop collapse toggle */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hidden lg:flex hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                      <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${!sidebarOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {sidebarOpen ? 'Réduire le menu' : 'Ouvrir le menu'}
                  </TooltipContent>
                </Tooltip>

                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-foreground relative">
                    {pageTitles[currentPage] || 'Tableau de bord'}
                    <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" />
                  </h2>
                  <kbd className="hidden md:inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono text-muted-foreground bg-muted rounded-md border border-border">
                    Ctrl K
                  </kbd>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Notification bell */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 hover:brightness-110 active:scale-[0.97]"
                      onClick={() => {
                        if (user.role === 'TEACHER') {
                          toast.info('Pas de volet de notifications pour les professeurs pour le moment.');
                        } else {
                          const notifPage = `${user.role.toLowerCase()}-notifications` as PageView;
                          setCurrentPage(notifPage);
                        }
                      }}
                    >
                      <Bell className="w-4 h-4" />
                      {/* Real-time notifications count badge */}
                      {unreadNotificationsCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1 animate-scale-in">
                          {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                        </span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Notifications</TooltipContent>
                </Tooltip>

                {/* Messages shortcut with unread badge */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 transition-all duration-200 active:scale-[0.97]"
                      onClick={() => handleNavigate('messages')}
                    >
                      <MessageSquare className="w-4 h-4" />
                      {unreadMessages > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white px-1 animate-scale-in">
                          {unreadMessages > 99 ? '99+' : unreadMessages}
                        </span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Messagerie{unreadMessages > 0 ? ` (${unreadMessages})` : ''}</TooltipContent>
                </Tooltip>

                {/* Dark mode toggle */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    {mounted ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-yellow-400 transition-all duration-200 active:scale-[0.97]"
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                      >
                        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                      </Button>
                    ) : (
                      <div className="w-8 h-8" />
                    )}
                  </TooltipTrigger>
                  <TooltipContent>{theme === 'dark' ? 'Mode clair' : 'Mode sombre'}</TooltipContent>
                </Tooltip>

                {/* User dropdown menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 h-8 px-2 rounded-full hover:bg-muted transition-all duration-200">
                      <Avatar className="h-7 w-7 ring-2 ring-blue-100 transition-all duration-200">
                        {user.photoUrl && <AvatarImage src={user.photoUrl} alt={user.fullName} />}
                        <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:inline text-sm font-medium text-foreground max-w-[120px] truncate">
                        {user.fullName}
                      </span>
                      <ChevronDown className="w-3 h-3 text-muted-foreground hidden sm:block" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{user.fullName}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${roleBadgeColors[user.role]}`}>
                            {roleLabels[user.role]}
                          </Badge>
                          {user.school && (
                            <span className="text-[10px] text-muted-foreground truncate max-w-[180px]">{user.school.name}</span>
                          )}
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    
                    {/* Interface Switcher */}
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs font-medium text-muted-foreground px-1">
                      Changer d'interface
                    </DropdownMenuLabel>
                    {Object.entries(roleLabels).map(([roleKey, roleLabel]) => {
                      const role = roleKey as UserRole;
                      const isCurrent = user.role === role;
                      const defaultPage = navItemsByRole[role]?.[0]?.page;
                      return (
                        <DropdownMenuItem
                          key={roleKey}
                          onClick={() => defaultPage && handleNavigate(defaultPage)}
                          className={`cursor-pointer flex items-center gap-2 ${isCurrent ? 'bg-primary/10 text-primary' : ''}`}
                          disabled={isCurrent}
                        >
                          {isCurrent && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                          <span className="capitalize text-sm">{roleLabel.toLowerCase()}</span>
                          {!isCurrent && defaultPage && (
                            <span className="text-[10px] text-muted-foreground ml-auto font-mono">
                              → {defaultPage}
                            </span>
                          )}
                        </DropdownMenuItem>
                      );
                    })}
                    
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleNavigate('profile')} className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Mon profil
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Déconnexion
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          )}
        </header>

        {/* ✅ Main content: overflow-y-auto pour le scroll, min-h-0 pour flexibilité */}
        <main 
          className={`flex-1 overflow-y-auto min-h-0 ${isMobile ? 'pb-24' : ''}`}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* ✅ Conteneur de page: flex-1 min-h-0 pour que les enfants puissent scroller */}
          <div className="p-4 lg:p-6 animate-fade-in flex flex-col flex-1 min-h-0" key={currentPage}>
            {children}
          </div>
        </main>

        {/* ✅ Footer avec shrink-0 pour rester en bas */}
        <footer className="shrink-0 relative">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-300 to-transparent" />
          <div className="py-3 px-4 lg:px-6 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjAuNSIgZmlsbD0icmdiYSgwLDAsMCwwLjAzKSIvPjwvc3ZnPg==')] bg-repeat">
            <p className="text-xs text-muted-foreground text-center">
              © GradeUp – Créé par{' '}
              <span className="font-medium text-blue-600">Axion Labs Technologies</span>
            </p>
            <div className="flex items-center justify-center gap-4 mt-1">
              <a
                href="https://wa.me/243845072349"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-emerald-600 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </a>
              <a
                href="https://instagram.com/axion_labs_technologies"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-pink-600 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
                Instagram
              </a>
              <a
                href="https://axionlabstechnologies.netlify.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-blue-600 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
                Site web
              </a>
            </div>
          </div>
        </footer>
      </div>

      {/* Command Palette */}
      <CommandPalette />

      {/* Logout confirmation dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Se déconnecter ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de vous déconnecter de votre compte {roleLabels[user.role].toLowerCase()}.
              Voulez-vous continuer ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmLogout}
              className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-300"
            >
              Se déconnecter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bottom Tab Bar (iOS style) on Mobile */}
      {isMobile && (
        <nav 
          className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-card/90 backdrop-blur-xl border-t flex items-center justify-around px-2 z-40 shadow-lg"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {(() => {
            if (!user) return null;
            let tabs = bottomTabsByRole[user.role] || [];
            if (user.role === 'TEACHER' && !user.isTitulaire) {
              tabs = tabs.filter(t => t.page !== 'teacher-reports');
            }
            return tabs;
          })()?.map((tab) => {
            const isActive = currentPage === tab.page;
            const Icon = tab.icon;
            
            // Show badge count if it's the notification or message tab
            const isNotifTab = tab.page.includes('notification');
            const isMsgTab = tab.page === 'messages';
            
            return (
              <button
                key={tab.page}
                onClick={() => handleNavigate(tab.page)}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-all duration-200 ${
                  isActive ? 'text-primary scale-105 font-semibold animate-scale-in' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px] text-blue-600 dark:text-blue-400' : 'stroke-[1.8px]'}`} />
                  {isNotifTab && unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-[14px] h-3.5 flex items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white px-0.5 animate-scale-in">
                      {unreadNotificationsCount}
                    </span>
                  )}
                  {isMsgTab && unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-[14px] h-3.5 flex items-center justify-center rounded-full bg-blue-500 text-[8px] font-bold text-white px-0.5 animate-scale-in">
                      {unreadMessages}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-1 tracking-tight truncate max-w-full">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}