'use client';

import React from 'react';
import { useAppStore } from '@/lib/store';
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
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  GraduationCap,
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
    { label: 'Classes', page: 'admin-classes', icon: GraduationCap, emoji: '🏫' },
    { label: 'Paiements', page: 'admin-payments', icon: CreditCard, emoji: '💳' },
    { label: 'Configuration', page: 'admin-config', icon: Settings, emoji: '⚙️' },
    { label: 'Rapports', page: 'admin-reports', icon: BarChart3, emoji: '📈' },
    { label: 'Notifications', page: 'admin-notifications', icon: Bell, emoji: '🔔' },
    { label: 'Messages', page: 'messages', icon: MessageSquare, emoji: '💬' },
    { label: 'Calendrier', page: 'calendar', icon: CalendarDays, emoji: '📆' },
    { label: 'Profil', page: 'profile', icon: User, emoji: '👤' },
  ],
  TEACHER: [
    { label: 'Tableau de bord', page: 'teacher-dashboard', icon: LayoutDashboard, emoji: '📊' },
    { label: 'Cours', page: 'teacher-courses', icon: BookOpen, emoji: '📚' },
    { label: 'Leçons', page: 'teacher-lessons', icon: FileText, emoji: '📖' },
    { label: 'Notes', page: 'teacher-grades', icon: ClipboardList, emoji: '📝' },
    { label: 'Devoirs', page: 'teacher-homework', icon: ClipboardCheck, emoji: '📋' },
    { label: 'Absences', page: 'teacher-attendance', icon: Calendar, emoji: '📅' },
    { label: 'IA Gradie', page: 'teacher-ai', icon: Bot, emoji: '🤖' },
    { label: 'Calendrier', page: 'calendar', icon: CalendarDays, emoji: '📆' },
    { label: 'Profil', page: 'profile', icon: User, emoji: '👤' },
  ],
  STUDENT: [
    { label: 'Tableau de bord', page: 'student-dashboard', icon: LayoutDashboard, emoji: '📊' },
    { label: 'Cours', page: 'student-courses', icon: BookOpen, emoji: '📚' },
    { label: 'Leçons', page: 'student-lessons', icon: FileText, emoji: '📖' },
    { label: 'Notes', page: 'student-grades', icon: ClipboardList, emoji: '📝' },
    { label: 'Absences', page: 'student-attendance', icon: Calendar, emoji: '📅' },
    { label: 'Paiements', page: 'student-payments', icon: CreditCard, emoji: '💳' },
    { label: 'IA Gradie', page: 'student-ai', icon: Bot, emoji: '🤖' },
    { label: 'Notifications', page: 'student-notifications', icon: Bell, emoji: '🔔' },
    { label: 'Calendrier', page: 'calendar', icon: CalendarDays, emoji: '📆' },
    { label: 'Profil', page: 'profile', icon: User, emoji: '👤' },
  ],
  PARENT: [
    { label: 'Tableau de bord', page: 'parent-dashboard', icon: LayoutDashboard, emoji: '📊' },
    { label: 'Suivi scolaire', page: 'parent-grades', icon: BarChart3, emoji: '📊' },
    { label: 'Paiements', page: 'parent-payments', icon: CreditCard, emoji: '💳' },
    { label: 'Notifications', page: 'parent-notifications', icon: Bell, emoji: '🔔' },
    { label: 'Profil', page: 'profile', icon: User, emoji: '👤' },
  ],
};

const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Administrateur',
  TEACHER: 'Professeur',
  STUDENT: 'Élève',
  PARENT: 'Parent',
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
  'teacher-dashboard': 'Tableau de bord',
  'teacher-courses': 'Cours',
  'teacher-lessons': 'Leçons',
  'teacher-grades': 'Notes',
  'teacher-homework': 'Devoirs',
  'teacher-attendance': 'Absences',
  'teacher-ai': 'IA Gradie',
  'student-dashboard': 'Tableau de bord',
  'student-courses': 'Cours',
  'student-lessons': 'Leçons',
  'student-grades': 'Notes',
  'student-attendance': 'Absences',
  'student-payments': 'Paiements',
  'student-ai': 'IA Gradie',
  'student-notifications': 'Notifications',
  'parent-dashboard': 'Tableau de bord',
  'parent-grades': 'Suivi scolaire',
  'parent-payments': 'Paiements',
  'parent-notifications': 'Notifications',
  'profile': 'Profil',
  'messages': 'Messages',
  'calendar': 'Calendrier',
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
  user: { fullName: string; role: UserRole; photoUrl?: string };
  currentPage: PageView;
  onNavigate: (page: PageView) => void;
  onLogout: () => void;
}) {
  const navItems = navItemsByRole[user.role];
  const initials = user.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (collapsed) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-b from-sidebar via-sidebar to-sidebar/95 text-sidebar-foreground shadow-lg shadow-black/10">
        {/* Brand */}
        <div className="flex flex-col items-center justify-center h-16 px-2 gap-1.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sidebar-primary to-blue-400 flex items-center justify-center shadow-md shadow-blue-500/20">
            <GraduationCap className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div className="gradient-accent-line w-7" />
        </div>

        <Separator className="bg-sidebar-border" />

        {/* Nav items - icons only */}
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
        <div className="p-2 flex justify-center">
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
      {/* Brand */}
      <div className="flex flex-col items-start gap-1.5 h-16 px-4 shrink-0 justify-center">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sidebar-primary to-blue-400 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
            <GraduationCap className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-base font-bold tracking-tight text-sidebar-foreground">GradeUp</span>
            <span className="text-[10px] text-sidebar-foreground/50 truncate">
              {user.role === 'ADMIN' ? 'Administration' : roleLabels[user.role]}
            </span>
          </div>
        </div>
        <div className="gradient-accent-line w-full" />
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Navigation */}
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
      </ScrollArea>

      <Separator className="bg-sidebar-border" />

      {/* User info */}
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
  const { user, currentPage, setCurrentPage, sidebarOpen, setSidebarOpen, setUser } = useAppStore();

  if (!user) return null;

  const handleLogout = () => {
    setUser(null);
    setCurrentPage('auth');
  };

  const handleNavigate = (page: PageView) => {
    setCurrentPage(page);
    // Close mobile sheet
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
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
      <Sheet open={sidebarOpen && typeof window !== 'undefined' && window.innerWidth < 1024} onOpenChange={setSidebarOpen}>
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Header with backdrop blur */}
        <header className="h-14 border-b bg-card/80 backdrop-blur-xl shrink-0 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden hover:bg-blue-50 hover:text-blue-600 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>

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

            <h2 className="text-base font-semibold text-foreground relative">
              {pageTitles[currentPage] || 'Tableau de bord'}
              <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" />
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 hover:brightness-110 active:scale-[0.97]"
                  onClick={() => {
                    const notifPage = `${user.role.toLowerCase()}-notifications` as PageView;
                    setCurrentPage(notifPage);
                  }}
                >
                  <Bell className="w-4 h-4" />
                  {/* Pulsing notification dot */}
                  <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 animate-pulse-ring text-red-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Notifications</TooltipContent>
            </Tooltip>

            {/* User avatar */}
            <Avatar className="h-8 w-8 ring-2 ring-blue-100 transition-all duration-200 hover:ring-blue-300">
              {user.photoUrl && <AvatarImage src={user.photoUrl} alt={user.fullName} />}
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                {user.fullName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Content with fade-in animation */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 animate-fade-in" key={currentPage}>
            {children}
          </div>
        </main>

        {/* Footer with gradient divider */}
        <footer className="shrink-0 relative">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-300 to-transparent" />
          <div className="py-3 px-4 lg:px-6 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjAuNSIgZmlsbD0icmdiYSgwLDAsMCwwLjAzKSIvPjwvc3ZnPg==')] bg-repeat">
            <p className="text-xs text-muted-foreground text-center">
              © GradeUp – Créé par{' '}
              <span className="font-medium text-blue-600">Axions Labs</span>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
