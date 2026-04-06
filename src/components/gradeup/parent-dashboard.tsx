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
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  BookOpen,
  CalendarX,
  CreditCard,
  Bell,
  GraduationCap,
  Users,
  Clock,
  MessageSquare,
  Send,
  Shield,
  Heart,
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

  const getAverageProgressColor = (avg: number) => {
    if (avg >= 14) return 'from-emerald-400 to-emerald-500';
    if (avg >= 10) return 'from-amber-400 to-amber-500';
    return 'from-red-400 to-red-500';
  };

  const getAverageBgColor = (avg: number) => {
    if (avg >= 14) return 'bg-emerald-50';
    if (avg >= 10) return 'bg-amber-50';
    return 'bg-red-50';
  };

  if (!user) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 p-6 lg:p-8 text-white shadow-xl shadow-blue-500/20">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wOCkiLz48L3N2Zz4=')] opacity-50" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-sm">
              <Heart className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">
                Bienvenue, {user.fullName}
              </h1>
              <p className="text-blue-100 text-sm lg:text-base mt-0.5">
                Suivez la scolarité de vos enfants en toute simplicité
              </p>
            </div>
          </div>
        </div>
        <div className="absolute top-4 right-6 hidden lg:block">
          <Shield className="h-24 w-24 text-white/10" />
        </div>
      </div>

      {children.length === 0 ? (
        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="p-4 rounded-full bg-blue-50">
              <Users className="h-12 w-12 text-blue-300" />
            </div>
            <p className="text-muted-foreground text-center max-w-sm">
              Aucun enfant trouvé. Veuillez contacter l&apos;administration pour lier votre compte.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Child Selector Card */}
          {children.length > 1 && (
            <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-50">
                    <Users className="h-4 w-4 text-blue-500" />
                  </div>
                  Mes enfants
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {children.map((child, idx) => (
                    <button
                      key={child.id}
                      onClick={() => setSelectedChildIndex(idx)}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-300 hover:shadow-md ${
                        selectedChildIndex === idx
                          ? 'border-blue-400 bg-blue-50 shadow-md shadow-blue-100'
                          : 'border-transparent bg-muted/40 hover:bg-muted/60 hover:border-blue-200'
                      }`}
                    >
                      <Avatar className="size-10 ring-2 ring-white shadow-sm">
                        <AvatarImage src={child.photoUrl} alt={child.fullName} />
                        <AvatarFallback className="text-xs bg-blue-100 text-blue-700 font-semibold">
                          {child.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-left">
                        <p className={`text-sm font-semibold ${selectedChildIndex === idx ? 'text-blue-700' : 'text-foreground'}`}>
                          {child.fullName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {child.classEnrollments?.[0]?.class?.name || 'Non assigné'}
                        </p>
                      </div>
                      {selectedChildIndex === idx && (
                        <div className="h-2 w-2 rounded-full bg-blue-500 ml-2 animate-pulse-soft" />
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Child Info Card */}
          {selectedChild && (
            <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 p-[2px]">
                <div className="w-full h-full rounded-[calc(0.625rem-1px)] bg-card" />
              </div>
              <CardContent className="relative p-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                  <Avatar className="size-20 ring-3 ring-blue-200 shadow-lg shadow-blue-100">
                    <AvatarImage src={selectedChild.photoUrl} alt={selectedChild.fullName} />
                    <AvatarFallback className="text-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold">
                      {selectedChild.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-center sm:text-left min-w-0">
                    <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3">
                      <h2 className="text-xl font-bold truncate">{selectedChild.fullName}</h2>
                      <Badge className="bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 hover:from-blue-200 hover:to-blue-100 font-medium">Élève</Badge>
                    </div>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5 bg-blue-50 px-2.5 py-1 rounded-lg">
                        <GraduationCap className="size-4 text-blue-500" />
                        <span className="font-medium text-blue-700">{childClass}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="size-4" />
                        Élève
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stat Cards */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="transition-all duration-300">
                  <CardContent className="pt-6">
                    <Skeleton className="h-4 w-24 mb-3" />
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Moyenne de l&apos;enfant</p>
                      <p className="text-3xl font-bold mt-1">{average.toFixed(1)}<span className="text-sm font-normal text-muted-foreground">/20</span></p>
                    </div>
                    <div className={`size-12 rounded-xl ${getAverageBgColor(average)} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <TrendingUp className={`size-5 ${getGradeColor(average * 5, 100)}`} />
                    </div>
                  </div>
                  {grades.length > 0 && (
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-3">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${getAverageProgressColor(average)} transition-all duration-700`}
                        style={{ width: `${Math.min((average / 20) * 100, 100)}%` }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Cours</p>
                      <p className="text-3xl font-bold mt-1">{courseCount}</p>
                    </div>
                    <div className="size-12 rounded-xl bg-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <BookOpen className="size-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Absences</p>
                      <p className="text-3xl font-bold mt-1">{absences}</p>
                    </div>
                    <div className="size-12 rounded-xl bg-amber-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <CalendarX className="size-5 text-amber-600" />
                    </div>
                  </div>
                  {absences > 0 && (
                    <p className="text-[10px] text-amber-600 mt-2 font-medium">Suivi à renforcer</p>
                  )}
                </CardContent>
              </Card>

              <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Paiements en attente</p>
                      <p className="text-3xl font-bold mt-1">{pendingPayments}</p>
                    </div>
                    <div className={`size-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 ${
                      pendingPayments > 0 ? 'bg-red-50' : 'bg-emerald-50'
                    }`}>
                      <CreditCard className={`size-5 ${pendingPayments > 0 ? 'text-red-600' : 'text-emerald-600'}`} />
                    </div>
                  </div>
                  {pendingPayments === 0 && (
                    <p className="text-[10px] text-emerald-600 mt-2 font-medium">Tout est à jour ✓</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Grades & Notifications */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Grades */}
            <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-50">
                    <TrendingUp className="size-4 text-blue-600" />
                  </div>
                  Notes récentes
                </CardTitle>
                <CardDescription>Dernières évaluations de {selectedChild?.fullName || 'votre enfant'}</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full rounded-xl" />
                    ))}
                  </div>
                ) : recentGrades.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <div className="p-4 rounded-full bg-blue-50">
                      <BookOpen className="size-8 text-blue-300" />
                    </div>
                    <p className="text-sm text-muted-foreground">Aucune note disponible</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-80">
                    <div className="space-y-2.5">
                      {recentGrades.map(grade => {
                        const pct = grade.maxScore > 0 ? (grade.score / grade.maxScore) * 100 : 0;
                        return (
                          <div key={grade.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all duration-200 hover:shadow-sm border border-transparent hover:border-border">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold truncate">{grade.course?.name || 'Cours'}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{formatDate(grade.createdAt)}</p>
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
            <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-50">
                    <Bell className="size-4 text-blue-600" />
                  </div>
                  Notifications récentes
                </CardTitle>
                <CardDescription>Dernières notifications de l&apos;école</CardDescription>
              </CardHeader>
              <CardContent>
                {recentNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <div className="p-4 rounded-full bg-blue-50">
                      <Bell className="size-8 text-blue-300" />
                    </div>
                    <p className="text-sm text-muted-foreground">Aucune notification</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-80">
                    <div className="space-y-2.5">
                      {recentNotifications.map(notif => (
                        <div
                          key={notif.id}
                          className={`flex items-start gap-3 p-3 rounded-xl transition-all duration-200 hover:shadow-sm ${
                            notif.read
                              ? 'bg-muted/20'
                              : 'bg-gradient-to-r from-blue-50 to-white border border-blue-100'
                          }`}
                        >
                          <div className={`mt-0.5 size-2.5 rounded-full shrink-0 ${notif.read ? 'bg-muted-foreground/30' : 'bg-blue-500 animate-pulse-soft'}`} />
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm ${notif.read ? 'text-muted-foreground' : 'font-medium'}`}>{notif.message}</p>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Clock className="size-3" />
                              {formatDate(notif.createdAt)}
                            </p>
                          </div>
                          {!notif.read && (
                            <Badge variant="outline" className="text-[10px] shrink-0 border-blue-200 text-blue-600 bg-blue-50/50">
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

          {/* Communication Section */}
          <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50">
                  <MessageSquare className="size-4 text-blue-600" />
                </div>
                Communication
              </CardTitle>
              <CardDescription>Contactez les professeurs ou l&apos;administration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-blue-50/80 to-white border border-blue-100 transition-all duration-200 hover:shadow-md">
                  <div className="p-3 rounded-xl bg-blue-100 text-blue-600 shrink-0">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Professeurs</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Contactez directement les professeurs de votre enfant pour des questions pédagogiques.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 hover:scale-[1.02] transition-all duration-300"
                    >
                      <Send className="h-3 w-3 mr-1.5" />
                      Envoyer un message
                    </Button>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-indigo-50/80 to-white border border-indigo-100 transition-all duration-200 hover:shadow-md">
                  <div className="p-3 rounded-xl bg-indigo-100 text-indigo-600 shrink-0">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Administration</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Contactez le secrétariat pour les questions administratives, inscriptions ou paiements.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 hover:scale-[1.02] transition-all duration-300"
                    >
                      <Send className="h-3 w-3 mr-1.5" />
                      Envoyer un message
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
