'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Users,
  GraduationCap,
  DollarSign,
  UsersRound,
  AlertTriangle,
  Clock,
  Plus,
  BookOpen,
  Bell,
  TrendingUp,
  School,
  CheckCircle2,
  Inbox,
  Search,
  Key,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';
import WelcomeBanner from './welcome-banner';
import ActivityFeed from './activity-feed';
import { MonthlyRevenueChart, GradeDistributionChart } from './charts-widget';

interface Stats {
  totalStudents: number;
  totalTeachers: number;
  totalParents: number;
  totalClasses: number;
  totalCourses: number;
  totalPayments: number;
  totalRevenue: number;
  pendingRevenue: number;
  attendanceToday: {
    present: number;
    absent: number;
    total: number;
  };
}

interface StudentResult {
  id: string;
  fullName: string;
  email: string;
  photoUrl: string;
  classEnrollments?: { class: { id: string; name: string } }[];
}

export default function AdminDashboard() {
  const { user, setCurrentPage } = useAppStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [overduePayments, setOverduePayments] = useState<any[]>([]);

  // Student search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StudentResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentResult | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Invite code
  const [inviteCode, setInviteCode] = useState(user?.school?.inviteCode || '');
  const [regeneratingCode, setRegeneratingCode] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Close search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/users?schoolId=${user?.schoolId}&role=STUDENT&search=${encodeURIComponent(query.trim())}`
        );
        const data = await res.json();
        setSearchResults(Array.isArray(data.users) ? data.users : []);
        setSearchOpen(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [user?.schoolId]);

  useEffect(() => {
    if (user?.schoolId) {
      fetchStats();
      fetchAlerts();
    }
  }, [user?.schoolId]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/stats?schoolId=${user?.schoolId}`);
      const data = await res.json();
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const [pendingRes, overdueRes] = await Promise.all([
        fetch(`/api/payments?schoolId=${user?.schoolId}&status=pending`),
        fetch(`/api/payments?schoolId=${user?.schoolId}&status=overdue`),
      ]);
      const pendingData = await pendingRes.json();
      const overdueData = await overdueRes.json();
      setPendingPayments(pendingData.payments?.slice(0, 5) || []);
      setOverduePayments(overdueData.payments?.slice(0, 5) || []);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  const statCards = [
    {
      title: 'Total Élèves',
      value: stats?.totalStudents ?? 0,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      change: '+12%',
      up: true,
    },
    {
      title: 'Total Professeurs',
      value: stats?.totalTeachers ?? 0,
      icon: GraduationCap,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
      change: '+3%',
      up: true,
    },
    {
      title: 'Revenus',
      value: `${(stats?.totalRevenue ?? 0).toLocaleString()} USD`,
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      change: '+18%',
      up: true,
    },
    {
      title: 'Total Parents',
      value: stats?.totalParents ?? 0,
      icon: UsersRound,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      change: '-2%',
      up: false,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-blue-700 p-6 lg:p-8 text-white shadow-xl shadow-[0_0_40px_-10px_rgba(59,130,246,0.15)]">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wOCkiLz48L3N2Zz4=')] opacity-50" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <School className="h-8 w-8 animate-pulse-soft" />
            <h1 className="text-2xl lg:text-3xl font-bold">
              Bienvenue, {user?.fullName}
            </h1>
          </div>
          <p className="text-blue-100 text-sm lg:text-base max-w-xl">
            Vue d&apos;ensemble de votre école — <span className="font-semibold text-white">{user?.school?.name}</span>
          </p>
        </div>
        <div className="absolute top-4 right-6 hidden lg:block">
          <GraduationCap className="h-24 w-24 text-white/10" />
        </div>
      </div>

      {/* Onboarding Welcome Banner */}
      {!loading && (
        <WelcomeBanner totalStudents={stats?.totalStudents ?? 0} />
      )}

      {/* School Invite Code Card */}
      <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 rounded-2xl">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30">
                <Key className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold">Code école</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Partagez ce code pour inscrire les membres</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2.5">
                <Key className="w-4 h-4 text-blue-600" />
                <span className="text-lg font-bold font-mono tracking-wider text-blue-700">{inviteCode || '—'}</span>
                <button
                  onClick={() => {
                    if (inviteCode) {
                      navigator.clipboard.writeText(inviteCode);
                      setCodeCopied(true);
                      setTimeout(() => setCodeCopied(false), 2000);
                    }
                  }}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                  disabled={!inviteCode}
                >
                  {codeCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-blue-300 text-blue-700 hover:bg-blue-50 hover:text-blue-800 transition-all duration-200"
                onClick={async () => {
                  if (!user?.schoolId) return;
                  setRegeneratingCode(true);
                  try {
                    const res = await fetch('/api/invite-code', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ schoolId: user.schoolId }),
                    });
                    const data = await res.json();
                    if (data.inviteCode) {
                      setInviteCode(data.inviteCode);
                    }
                  } catch { /* skip */ }
                  setRegeneratingCode(false);
                }}
                disabled={regeneratingCode}
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${regeneratingCode ? 'animate-spin' : ''}`} />
                Régénérer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Student Search */}
      <div ref={searchRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher un élève par nom..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleSearch(e.target.value);
            }}
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-colors"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Search dropdown */}
        {searchOpen && (searchResults.length > 0 || searchQuery.trim()) && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg max-h-64 overflow-y-auto">
            {searchResults.length === 0 && !searching ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Aucun résultat trouvé
              </div>
            ) : (
              searchResults.map((student) => (
                <button
                  key={student.id}
                  onClick={() => {
                    setSelectedStudent(student);
                    setSearchOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-accent transition-colors border-b border-border last:border-0"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-primary">
                      {student.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {student.fullName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {student.classEnrollments && student.classEnrollments.length > 0
                        ? student.classEnrollments.map((e) => e.class.name).join(', ')
                        : 'Non assigné'}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* Selected student card */}
        {selectedStudent && (
          <div className="mt-3 p-4 rounded-lg border bg-card animate-fade-in">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {selectedStudent.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-foreground">{selectedStudent.fullName}</p>
                  <p className="text-xs text-muted-foreground">{selectedStudent.email}</p>
                  {selectedStudent.classEnrollments && selectedStudent.classEnrollments.length > 0 && (
                    <p className="text-xs text-primary mt-0.5">
                      {selectedStudent.classEnrollments.map((e) => e.class.name).join(', ')}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
              >
                &times;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stat Cards */}
      <div className="stagger-children grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))
          : statCards.map((card, index) => (
              <Card
                key={card.title}
                className={`group border ${card.border} overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-opacity-60 hover:brightness-110 animate-scale-in rounded-2xl`}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${card.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <CardContent className="relative p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-3 rounded-xl ${card.bg} group-hover:scale-110 transition-transform duration-300`}>
                      <card.icon className={`h-6 w-6 ${card.color}`} />
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      card.up
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-red-50 text-red-500'
                    }`}>
                      {card.up ? '↑' : '↓'} {card.change}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{card.title}</p>
                    <p className="text-2xl font-bold text-foreground transition-all duration-700">{card.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Secondary Stats */}
      {!loading && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 group-hover:from-orange-100 group-hover:to-orange-200 transition-all duration-300">
                <BookOpen className="h-5 w-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Total Classes</p>
                <div className="flex items-end gap-2">
                  <p className="text-xl font-bold">{stats.totalClasses}</p>
                  <span className="text-xs font-medium text-emerald-600 mb-0.5">+5%</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-50 to-cyan-100 transition-all duration-300">
                <TrendingUp className="h-5 w-5 text-cyan-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Revenus en attente</p>
                <div className="flex items-end gap-2">
                  <p className="text-xl font-bold">{stats.pendingRevenue.toLocaleString()} USD</p>
                  <span className="text-xs font-medium text-amber-600 mb-0.5">-3%</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-teal-50 to-teal-100 transition-all duration-300">
                <Clock className="h-5 w-5 text-teal-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Présence aujourd&apos;hui</p>
                <div className="flex items-end gap-2">
                  <p className="text-xl font-bold">
                    {stats.attendanceToday.total > 0
                      ? `${Math.round(
                          (stats.attendanceToday.present / stats.attendanceToday.total) * 100
                        )}%`
                      : 'N/A'}
                  </p>
                  <span className="text-xs font-medium text-emerald-600 mb-0.5">↑ 2%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:brightness-110 rounded-2xl relative">
        {/* Decorative dots pattern */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoNTksMTMwLDI0NiwwLjA4KSIvPjwvc3ZnPg==')] bg-repeat opacity-50 pointer-events-none" />
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50">
              <Plus className="h-4 w-4 text-blue-600" />
            </div>
            Actions rapides
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 relative">
          <Button
            onClick={() => setCurrentPage('admin-users')}
            className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] hover:brightness-110 active:scale-[0.97] transition-all duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un élève
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentPage('admin-classes')}
            className="border-blue-200 text-blue-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 hover:border-blue-300 hover:scale-[1.02] hover:brightness-110 active:scale-[0.97] transition-all duration-200 rounded-xl"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Créer une classe
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentPage('admin-notifications')}
            className="border-blue-200 text-blue-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 hover:border-blue-300 hover:scale-[1.02] hover:brightness-110 active:scale-[0.97] transition-all duration-200 rounded-xl"
          >
            <Bell className="h-4 w-4 mr-2" />
            Envoyer notification
          </Button>
        </CardContent>
      </Card>

      {/* Charts Section */}
      {user?.schoolId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <MonthlyRevenueChart schoolId={user.schoolId} />
          <GradeDistributionChart schoolId={user.schoolId} />
        </div>
      )}

      {/* Activity Feed */}
      {user?.schoolId && <ActivityFeed schoolId={user.schoolId} />}

      {/* Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pending Payments */}
        <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:brightness-110 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-yellow-50">
                <Clock className="h-4 w-4 text-yellow-500" />
              </div>
              Paiements en attente
              {pendingPayments.length > 0 && (
                <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 font-semibold">
                  {pendingPayments.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingPayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <div className="p-3 rounded-full bg-emerald-50">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                </div>
                <p className="text-sm text-muted-foreground">Aucun paiement en attente</p>
              </div>
            ) : (
              <ScrollArea className="max-h-64">
                <div className="space-y-3">
                  {pendingPayments.map((p: any) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-yellow-50/80 border border-yellow-100 hover:bg-yellow-50 transition-colors duration-200"
                    >
                      <div>
                        <p className="text-sm font-medium">{p.student?.fullName || 'Inconnu'}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.month} — {parseFloat(p.amount).toLocaleString()} USD
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200 font-medium">
                        En attente
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Overdue Payments */}
        <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:brightness-110 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </div>
              Paiements en retard
              {overduePayments.length > 0 && (
                <Badge className="bg-red-100 text-red-700 hover:bg-red-100 font-semibold">
                  {overduePayments.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overduePayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <div className="p-3 rounded-full bg-emerald-50">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                </div>
                <p className="text-sm text-muted-foreground">Aucun paiement en retard</p>
              </div>
            ) : (
              <ScrollArea className="max-h-64">
                <div className="space-y-3">
                  {overduePayments.map((p: any) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-red-50/80 border border-red-100 hover:bg-red-50 transition-colors duration-200"
                    >
                      <div>
                        <p className="text-sm font-medium">{p.student?.fullName || 'Inconnu'}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.month} — {parseFloat(p.amount).toLocaleString()} USD
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 font-medium">
                        En retard
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
