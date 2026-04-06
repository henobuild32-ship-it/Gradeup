'use client';

import { useEffect, useState } from 'react';
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
} from 'lucide-react';

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

export default function AdminDashboard() {
  const { user, setCurrentPage } = useAppStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [overduePayments, setOverduePayments] = useState<any[]>([]);

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
    },
    {
      title: 'Total Professeurs',
      value: stats?.totalTeachers ?? 0,
      icon: GraduationCap,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
    },
    {
      title: 'Revenus',
      value: `${(stats?.totalRevenue ?? 0).toLocaleString()} USD`,
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
    },
    {
      title: 'Total Parents',
      value: stats?.totalParents ?? 0,
      icon: UsersRound,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-muted-foreground">
          Vue d&apos;ensemble de votre école — {user?.school?.name}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))
          : statCards.map((card) => (
              <Card key={card.title} className={`border ${card.border}`}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${card.bg}`}>
                    <card.icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <p className="text-2xl font-bold">{card.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Secondary Stats */}
      {!loading && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-orange-50">
                <BookOpen className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Classes</p>
                <p className="text-xl font-bold">{stats.totalClasses}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-cyan-50">
                <TrendingUp className="h-5 w-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenus en attente</p>
                <p className="text-xl font-bold">{stats.pendingRevenue.toLocaleString()} USD</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-teal-50">
                <Clock className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Présence aujourd&apos;hui</p>
                <p className="text-xl font-bold">
                  {stats.attendanceToday.total > 0
                    ? `${Math.round(
                        (stats.attendanceToday.present / stats.attendanceToday.total) * 100
                      )}%`
                    : 'N/A'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Actions rapides</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            onClick={() => setCurrentPage('admin-users')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un élève
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentPage('admin-classes')}
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Créer une classe
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentPage('admin-notifications')}
          >
            <Bell className="h-4 w-4 mr-2" />
            Envoyer notification
          </Button>
        </CardContent>
      </Card>

      {/* Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pending Payments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              Paiements en attente
              {pendingPayments.length > 0 && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                  {pendingPayments.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun paiement en attente
              </p>
            ) : (
              <ScrollArea className="max-h-64">
                <div className="space-y-3">
                  {pendingPayments.map((p: any) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 border border-yellow-100"
                    >
                      <div>
                        <p className="text-sm font-medium">{p.student?.fullName || 'Inconnu'}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.month} — {parseFloat(p.amount).toLocaleString()} USD
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200">
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
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Paiements en retard
              {overduePayments.length > 0 && (
                <Badge variant="secondary" className="bg-red-100 text-red-700">
                  {overduePayments.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overduePayments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun paiement en retard
              </p>
            ) : (
              <ScrollArea className="max-h-64">
                <div className="space-y-3">
                  {overduePayments.map((p: any) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-100"
                    >
                      <div>
                        <p className="text-sm font-medium">{p.student?.fullName || 'Inconnu'}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.month} — {parseFloat(p.amount).toLocaleString()} USD
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">
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
