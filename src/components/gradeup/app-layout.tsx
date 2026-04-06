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
  ],
  TEACHER: [
    { label: 'Tableau de bord', page: 'teacher-dashboard', icon: LayoutDashboard, emoji: '📊' },
    { label: 'Cours', page: 'teacher-courses', icon: BookOpen, emoji: '📚' },
    { label: 'Leçons', page: 'teacher-lessons', icon: FileText, emoji: '📖' },
    { label: 'Notes', page: 'teacher-grades', icon: ClipboardList, emoji: '📝' },
    { label: 'Devoirs', page: 'teacher-homework', icon: ClipboardCheck, emoji: '📋' },
    { label: 'Absences', page: 'teacher-attendance', icon: Calendar, emoji: '📅' },
    { label: 'IA Gradie', page: 'teacher-ai', icon: Bot, emoji: '🤖' },
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
  ],
  PARENT: [
    { label: 'Tableau de bord', page: 'parent-dashboard', icon: LayoutDashboard, emoji: '📊' },
    { label: 'Suivi scolaire', page: 'parent-grades', icon: BarChart3, emoji: '📊' },
    { label: 'Paiements', page: 'parent-payments', icon: CreditCard, emoji: '💳' },
    { label: 'Notifications', page: 'parent-notifications', icon: Bell, emoji: '🔔' },
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
      <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
        {/* Brand */}
        <div className="flex items-center justify-center h-16 px-2">
          <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
        </div>

        <Separator className="bg-sidebar-border" />

        {/* Nav items - icons only */}
        <ScrollArea className="flex-1 py-2">
          <nav className="flex flex-col items-center gap-1 px-2">
            {navItems.map((item) => {
              const isActive = currentPage === item.page;
              return (
                <Tooltip key={item.page}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onNavigate(item.page)}
                      className={`
                        flex items-center justify-center w-9 h-9 rounded-lg transition-colors
                        ${isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
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
                className="flex items-center justify-center w-9 h-9 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-destructive transition-colors"
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
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="flex items-center gap-3 h-16 px-4 shrink-0">
        <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
          <GraduationCap className="w-5 h-5 text-sidebar-primary-foreground" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-base font-bold tracking-tight text-sidebar-foreground">GradeUp</span>
          <span className="text-[10px] text-sidebar-foreground/50 truncate">
            {user.role === 'ADMIN' ? 'Administration' : roleLabels[user.role]}
          </span>
        </div>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Navigation */}
      <ScrollArea className="flex-1 py-3">
        <nav className="flex flex-col gap-1 px-3">
          {navItems.map((item) => {
            const isActive = currentPage === item.page;
            return (
              <button
                key={item.page}
                onClick={() => onNavigate(item.page)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
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
        <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/30">
          <Avatar className="h-8 w-8 shrink-0">
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
          className="w-full mt-2 text-sidebar-foreground/70 hover:text-destructive hover:bg-sidebar-accent/50 justify-start gap-2"
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
        {/* Top Header */}
        <header className="h-14 border-b bg-card shrink-0 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
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
                  className="hidden lg:flex"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  <ChevronLeft className={`w-4 h-4 transition-transform ${!sidebarOpen ? 'rotate-180' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {sidebarOpen ? 'Réduire le menu' : 'Ouvrir le menu'}
              </TooltipContent>
            </Tooltip>

            <h2 className="text-base font-semibold text-foreground">
              {pageTitles[currentPage] || 'Tableau de bord'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  onClick={() => {
                    const notifPage = `${user.role.toLowerCase()}-notifications` as PageView;
                    setCurrentPage(notifPage);
                  }}
                >
                  <Bell className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Notifications</TooltipContent>
            </Tooltip>

            {/* User avatar */}
            <Avatar className="h-8 w-8">
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

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t py-3 px-4 lg:px-6 shrink-0">
          <p className="text-xs text-muted-foreground text-center">
            © GradeUp – Créé par Axions Labs
          </p>
        </footer>
      </div>
    </div>
  );
}
