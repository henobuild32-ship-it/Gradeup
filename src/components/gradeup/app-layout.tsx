'use client';

import React, { useState, useEffect } from 'react';
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
    { label: 'Configuration', page: 'admin-config', icon: Settings, emoji: '⚙️' },
    { label: 'Rapports', page: 'admin-reports', icon: BarChart3, emoji: '📈' },
    { label: 'Notifications', page: 'admin-notifications', icon: Bell, emoji: '🔔' },
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
    { label: 'Absences', page: 'student-attendance', icon: Calendar, emoji: '📅' },
    { label: 'Paiements', page: 'student-payments', icon: CreditCard, emoji: '💳' },
    { label: 'IA Gradie', page: 'student-ai', icon: Bot, emoji: '🤖' },
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
    { label: 'Notifications', page: 'parent-notifications', icon: Bell, emoji: '🔔' },
    { label: 'Messagerie', page: 'messages', icon: MessageSquare, emoji: '💬' },
    { label: 'Profil', page: 'profile', icon: User, emoji: '👤' },
    { label: 'Aide', page: 'help', icon: Lightbulb, emoji: '💡' },
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
  const { user, currentPage, setCurrentPage, sidebarOpen, setSidebarOpen, setUser } = useAppStore();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

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
    setUser(null);
    setCurrentPage('auth');
    setShowLogoutDialog(false);
  };

  const handleNavigate = (page: PageView) => {
    setCurrentPage(page);
    // Close mobile sheet
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const initials = user.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

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

            <div className="flex items-center gap-2">
              <img src="/logo-gradeup.png" alt="GradeUp" className="w-7 h-7 rounded-md object-contain drop-shadow-sm lg:hidden" />
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
                    const notifPage = `${user.role.toLowerCase()}-notifications` as PageView;
                    setCurrentPage(notifPage);
                  }}
                >
                  <Bell className="w-4 h-4" />
                  {/* Unread message badge */}
                  {unreadMessages > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1 animate-scale-in">
                      {unreadMessages > 99 ? '99+' : unreadMessages}
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
    </div>
  );
}
