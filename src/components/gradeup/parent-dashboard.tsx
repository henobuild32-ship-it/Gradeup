'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import type { UserInfo, GradeInfo, PaymentInfo, AttendanceInfo, NotificationInfo } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  TrendingUp,
  BookOpen,
  CalendarX,
  CreditCard,
  Bell,
  GraduationCap,
  Users,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

export default function ParentDashboard() {
  const { user } = useAppStore();
  const [children, setChildren] = useState<UserInfo[]>([]);
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);
  const [grades, setGrades] = useState<GradeInfo[]>([]);
  const [attendance, setAttendance] = useState<AttendanceInfo[]>([]);
  const [payments, setPayments] = useState<PaymentInfo[]>([]);
  const [notifications, setNotifications] = useState<NotificationInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const selectedChild = children[selectedChildIndex] || null;
  const schoolId = user?.schoolId || '';

  useEffect(() => {
    fetchChildren();
  }, [user]);

  useEffect(() => {
    if (selectedChild) {
      fetchChildData(selectedChild.id);
    }
  }, [selectedChild]);

  useEffect(() => {
    if (schoolId) {
      fetchNotifications();
    }
  }, [schoolId]);

  const fetchChildren = async () => {
    if (!user?.id || !schoolId) return;
    try {
      const res = await fetch(`/api/users?schoolId=${schoolId}&role=STUDENT&parentId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setChildren(data);
      }
    } catch {
      toast.error('Erreur lors du chargement des enfants');
    }
  };

  const fetchChildData = async (childId: string) => {
    setLoading(true);
    try {
      const [gradesRes, attendanceRes, paymentsRes] = await Promise.all([
        fetch(`/api/grades?schoolId=${schoolId}&studentId=${childId}`),
        fetch(`/api/attendance?schoolId=${schoolId}&studentId=${childId}`),
        fetch(`/api/payments?schoolId=${schoolId}&studentId=${childId}`),
      ]);

      if (gradesRes.ok) setGrades(await gradesRes.json());
      if (attendanceRes.ok) setAttendance(await attendanceRes.json());
      if (paymentsRes.ok) setPayments(await paymentsRes.json());
    } catch {
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`/api/notifications?schoolId=${schoolId}&targetRole=PARENT`);
      if (res.ok) {
        setNotifications(await res.json());
      }
    } catch {
      // Silently fail for notifications
    }
  };

  const average = grades.length > 0
    ? grades.reduce((acc, g) => acc + (g.maxScore > 0 ? (g.score / g.maxScore) * 20 : 0), 0) / grades.length
    : 0;

  const absences = attendance.filter(a => a.status === 'absent').length;
  const pendingPayments = payments.filter(p => p.status === 'pending' || p.status === 'overdue').length;

  const childClass = selectedChild?.classEnrollments?.[0]?.class?.name || 'Non assigné';
  const courseCount = [...new Set(grades.map(g => g.courseId))].length;
  const recentGrades = [...grades].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  const recentNotifications = [...notifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getGradeColor = (score: number, max: number) => {
    const pct = (score / max) * 100;
    if (pct >= 80) return 'text-emerald-600';
    if (pct >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground">Bienvenue, {user.fullName}</p>
      </div>

      {children.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <Users className="size-12 text-muted-foreground/40" />
            <p className="text-muted-foreground text-center">Aucun enfant trouvé. Veuillez contacter l&apos;administration.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Child selector tabs */}
          {children.length > 1 && (
            <Tabs value={String(selectedChildIndex)} onValueChange={(v) => setSelectedChildIndex(Number(v))}>
              <TabsList className="flex-wrap h-auto gap-1 p-1">
                {children.map((child, idx) => (
                  <TabsTrigger key={child.id} value={String(idx)} className="gap-2">
                    <Avatar className="size-5">
                      <AvatarImage src={child.photoUrl} alt={child.fullName} />
                      <AvatarFallback className="text-[10px]">
                        {child.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    {child.fullName}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}

          {/* Child Info Card */}
          {selectedChild && (
            <Card className="border-blue-100 bg-gradient-to-r from-blue-50/50 to-white dark:from-blue-950/20 dark:to-background">
              <CardContent className="flex items-center gap-6 pt-6">
                <Avatar className="size-16 border-2 border-blue-200">
                  <AvatarImage src={selectedChild.photoUrl} alt={selectedChild.fullName} />
                  <AvatarFallback className="text-lg bg-blue-100 text-blue-700">
                    {selectedChild.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-xl font-semibold truncate">{selectedChild.fullName}</h2>
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Parent</Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <GraduationCap className="size-4" />
                      {childClass}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="size-4" />
                      Élève
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stat Cards */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <Skeleton className="h-4 w-24 mb-3" />
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Moyenne de l&apos;enfant</p>
                      <p className="text-3xl font-bold mt-1">{average.toFixed(1)}<span className="text-sm font-normal text-muted-foreground">/20</span></p>
                    </div>
                    <div className="size-10 rounded-full bg-emerald-100 flex items-center justify-center">
                      <TrendingUp className="size-5 text-emerald-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Cours</p>
                      <p className="text-3xl font-bold mt-1">{courseCount}</p>
                    </div>
                    <div className="size-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <BookOpen className="size-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Absences</p>
                      <p className="text-3xl font-bold mt-1">{absences}</p>
                    </div>
                    <div className="size-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <CalendarX className="size-5 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Paiements en attente</p>
                      <p className="text-3xl font-bold mt-1">{pendingPayments}</p>
                    </div>
                    <div className="size-10 rounded-full bg-red-100 flex items-center justify-center">
                      <CreditCard className="size-5 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Grades & Notifications */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Grades */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="size-5 text-blue-600" />
                  Notes récentes
                </CardTitle>
                <CardDescription>Dernières évaluations de {selectedChild?.fullName || 'votre enfant'}</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : recentGrades.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                    <BookOpen className="size-8 opacity-40" />
                    <p className="text-sm">Aucune note disponible</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-80">
                    <div className="space-y-3">
                      {recentGrades.map(grade => {
                        const pct = grade.maxScore > 0 ? (grade.score / grade.maxScore) * 100 : 0;
                        return (
                          <div key={grade.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{grade.course?.name || 'Cours'}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(grade.createdAt)}</p>
                            </div>
                            <div className="text-right flex items-center gap-3 ml-3">
                              {grade.comment && (
                                <span className="text-xs text-muted-foreground hidden sm:block max-w-[120px] truncate">{grade.comment}</span>
                              )}
                              <span className={`text-lg font-bold ${getGradeColor(grade.score, grade.maxScore)}`}>
                                {grade.score}/{grade.maxScore}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Recent Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="size-5 text-blue-600" />
                  Notifications récentes
                </CardTitle>
                <CardDescription>Dernières notifications de l&apos;école</CardDescription>
              </CardHeader>
              <CardContent>
                {recentNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                    <Bell className="size-8 opacity-40" />
                    <p className="text-sm">Aucune notification</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-80">
                    <div className="space-y-3">
                      {recentNotifications.map(notif => (
                        <div
                          key={notif.id}
                          className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                            notif.read ? 'bg-muted/30' : 'bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900'
                          }`}
                        >
                          <div className={`mt-0.5 size-2 rounded-full shrink-0 ${notif.read ? 'bg-muted-foreground/30' : 'bg-blue-500'}`} />
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm ${notif.read ? 'text-muted-foreground' : 'text-foreground'}`}>{notif.message}</p>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Clock className="size-3" />
                              {formatDate(notif.createdAt)}
                            </p>
                          </div>
                          {!notif.read && (
                            <Badge variant="outline" className="text-[10px] shrink-0 border-blue-200 text-blue-600">
                              Nouveau
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
