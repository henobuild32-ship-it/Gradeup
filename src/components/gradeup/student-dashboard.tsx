'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import type { CourseInfo, GradeInfo, AttendanceInfo, PaymentInfo, LessonInfo, NotificationInfo } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingUp, BookOpen, CalendarX, CreditCard, User, Bell, FileText, Clock, Sparkles, Target, Award, Key, Copy, Check, RefreshCw, Users } from 'lucide-react';
import { AttendanceTrendChart } from './charts-widget';

const subjectColors = [
  { border: 'border-l-blue-400', bg: 'bg-blue-50', text: 'text-blue-600' },
  { border: 'border-l-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  { border: 'border-l-purple-400', bg: 'bg-purple-50', text: 'text-purple-600' },
  { border: 'border-l-amber-400', bg: 'bg-amber-50', text: 'text-amber-600' },
  { border: 'border-l-rose-400', bg: 'bg-rose-50', text: 'text-rose-600' },
  { border: 'border-l-cyan-400', bg: 'bg-cyan-50', text: 'text-cyan-600' },
  { border: 'border-l-orange-400', bg: 'bg-orange-50', text: 'text-orange-600' },
  { border: 'border-l-indigo-400', bg: 'bg-indigo-50', text: 'text-indigo-600' },
];

const motivationalQuotes = [
  { text: "Le succès est la somme de petits efforts répétés jour après jour.", author: "Robert Collier" },
  { text: "L'éducation est l'arme la plus puissante pour changer le monde.", author: "Nelson Mandela" },
  { text: "Chaque expert a été un débutant.", author: "Helen Hayes" },
  { text: "La connaissance est le trésor qui accompagne son propriétaire partout.", author: "Proverbe chinois" },
  { text: "Le travail acharné bat le talent quand le talent ne travaille pas dur.", author: "Tim Notke" },
];

export default function StudentDashboard() {
  const user = useAppStore((s) => s.user);
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);
  const [courses, setCourses] = useState<CourseInfo[]>([]);
  const [grades, setGrades] = useState<GradeInfo[]>([]);
  const [attendance, setAttendance] = useState<AttendanceInfo[]>([]);
  const [payments, setPayments] = useState<PaymentInfo[]>([]);
  const [lessons, setLessons] = useState<LessonInfo[]>([]);
  const [notifications, setNotifications] = useState<NotificationInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [parentCode, setParentCode] = useState(user?.parentCode || '');
  const [generatingCode, setGeneratingCode] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const classId = user?.classEnrollments?.[0]?.classId;
  const className = user?.classEnrollments?.[0]?.class?.name || '—';

  useEffect(() => {
    if (!user?.schoolId) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ schoolId: user.schoolId });

        const [coursesRes, gradesRes, attendanceRes, paymentsRes, lessonsRes, notifsRes] = await Promise.all([
          classId
            ? fetch(`/api/courses?${params}&classId=${classId}`).then((r) => r.json())
            : Promise.resolve([]),
          fetch(`/api/grades?${params}&studentId=${user.id}`).then((r) => r.json()),
          fetch(`/api/attendance?${params}&studentId=${user.id}`).then((r) => r.json()),
          fetch(`/api/payments?${params}&studentId=${user.id}`).then((r) => r.json()),
          classId
            ? fetch(`/api/lessons?${params}&courseId=${courses.map(c => c.id).join(',') || 'none'}`).then((r) => r.json()).catch(() => [])
            : Promise.resolve([]),
          fetch(`/api/notifications?${params}&targetRole=STUDENT`).then((r) => r.json()),
        ]);

        setCourses(Array.isArray(coursesRes) ? coursesRes : []);
        setGrades(Array.isArray(gradesRes) ? gradesRes : []);
        setAttendance(Array.isArray(attendanceRes) ? attendanceRes : []);
        setPayments(Array.isArray(paymentsRes) ? paymentsRes : []);
        setNotifications(Array.isArray(notifsRes) ? notifsRes : (Array.isArray(notifsRes?.notifications) ? notifsRes.notifications : []));
      } catch (err) {
        console.error('Erreur chargement dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.schoolId, user?.id, classId]);

  // Fetch lessons for all courses once courses are loaded
  useEffect(() => {
    if (!user?.schoolId || courses.length === 0) return;
    const fetchLessons = async () => {
      try {
        const allLessons: LessonInfo[] = [];
        await Promise.all(
          courses.map(async (course) => {
            try {
              const res = await fetch(`/api/lessons?schoolId=${user.schoolId}&courseId=${course.id}`);
              const data = await res.json();
              if (Array.isArray(data.lessons)) allLessons.push(...data.lessons);
            } catch { /* skip */ }
          })
        );
        allLessons.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setLessons(allLessons.slice(0, 3));
      } catch { /* skip */ }
    };
    fetchLessons();
  }, [user?.schoolId, courses]);

  const generalAverage =
    grades.length > 0
      ? grades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) / grades.length
      : 0;

  const generalAverage20 = grades.length > 0
    ? grades.reduce((sum, g) => sum + (g.score / g.maxScore) * 20, 0) / grades.length
    : 0;

  const pendingPayments = payments.filter((p) => p.status !== 'paid').length;
  const absenceCount = attendance.filter((a) => a.status === 'absent').length;

  const recentNotifs = [...notifications]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Pick a quote based on the day of the month
  const dayIndex = new Date().getDate() % motivationalQuotes.length;
  const quote = motivationalQuotes[dayIndex];

  // Progress ring calculations (SVG circle)
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (generalAverage / 100) * circumference;

  const getAverageColor = (avg: number) => {
    if (avg >= 80) return 'text-emerald-500';
    if (avg >= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  const getAverageStroke = (avg: number) => {
    if (avg >= 80) return 'stroke-emerald-500';
    if (avg >= 60) return 'stroke-amber-500';
    return 'stroke-red-500';
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Profile Card with gradient border */}
      <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 p-[2px]">
          <div className="w-full h-full rounded-[calc(0.625rem-1px)] bg-card" />
        </div>
        <CardContent className="relative p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30">
                <User className="h-10 w-10" />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md">
                <Award className="h-4 w-4 text-blue-500" />
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3">
                <h2 className="text-xl font-bold text-foreground">Bonjour, {user?.fullName ? user.fullName.split(' ')[0] : 'Élève'} ! 👋</h2>
                <Badge className="bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600 shadow-sm">Élève</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Classe : <span className="font-semibold text-foreground">{className}</span>
              </p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>

            {/* Progress Ring */}
            {grades.length > 0 && (
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div className="relative w-24 h-24">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50" cy="50" r={radius}
                      fill="none"
                      strokeWidth="8"
                      className="stroke-blue-100"
                    />
                    <circle
                      cx="50" cy="50" r={radius}
                      fill="none"
                      strokeWidth="8"
                      strokeLinecap="round"
                      className={getAverageStroke(generalAverage)}
                      strokeDasharray={circumference}
                      strokeDashoffset={progressOffset}
                      style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-2xl font-bold ${getAverageColor(generalAverage)}`}>
                      {generalAverage20.toFixed(1)}
                    </span>
                    <span className="text-[10px] text-muted-foreground -mt-0.5">sur 20</span>
                  </div>
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">Moyenne</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Parent Code Card */}
      <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" />
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold">Code Parent</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Partagez ce code avec vos parents</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-2.5">
                <Key className="w-4 h-4 text-amber-600" />
                <span className="text-lg font-bold font-mono tracking-wider text-amber-700">{parentCode || '—'}</span>
                <button
                  onClick={() => {
                    if (parentCode) {
                      navigator.clipboard.writeText(parentCode);
                      setCodeCopied(true);
                      setTimeout(() => setCodeCopied(false), 2000);
                    }
                  }}
                  className="text-amber-600 hover:text-amber-800 transition-colors"
                  disabled={!parentCode}
                >
                  {codeCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800 transition-all duration-200"
                onClick={async () => {
                  if (!user?.id) return;
                  setGeneratingCode(true);
                  try {
                    const res = await fetch('/api/parent-code', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId: user.id }),
                    });
                    const data = await res.json();
                    if (data.parentCode) {
                      setParentCode(data.parentCode);
                    }
                  } catch { /* skip */ }
                  setGeneratingCode(false);
                }}
                disabled={generatingCode}
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${generatingCode ? 'animate-spin' : ''}`} />
                Régénérer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stat Cards - Grille tactile 2 colonnes adaptative */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card 
          className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group cursor-pointer"
          onClick={() => setCurrentPage('student-grades')}
        >
          <CardContent className="p-4 flex flex-col justify-between h-full min-h-[110px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground truncate">Notes</span>
              <TrendingUp className="h-4 w-4 text-blue-500 shrink-0" />
            </div>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {grades.length > 0 ? generalAverage20.toFixed(1) : '—'}
            </p>
            <p className="text-[10px] text-muted-foreground truncate mt-1">Moyenne générale</p>
          </CardContent>
        </Card>

        <Card 
          className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group cursor-pointer"
          onClick={() => setCurrentPage('student-attendance')}
        >
          <CardContent className="p-4 flex flex-col justify-between h-full min-h-[110px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground truncate">Absences</span>
              <CalendarX className="h-4 w-4 text-red-500 shrink-0" />
            </div>
            <p className="text-2xl font-bold text-red-600 mt-1">
              {absenceCount} {absenceCount > 1 ? 'retards' : 'retard'}
            </p>
            <p className="text-[10px] text-muted-foreground truncate mt-1">jours d'absence</p>
          </CardContent>
        </Card>

        <Card 
          className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group cursor-pointer"
          onClick={() => setCurrentPage('student-payments')}
        >
          <CardContent className="p-4 flex flex-col justify-between h-full min-h-[110px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground truncate">Paiement</span>
              <CreditCard className="h-4 w-4 text-emerald-500 shrink-0" />
            </div>
            <p className={`text-lg font-bold mt-1 ${pendingPayments > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {pendingPayments > 0 ? 'En attente' : 'À jour'}
            </p>
            <p className="text-[10px] text-muted-foreground truncate mt-1">{pendingPayments > 0 ? `${pendingPayments} en attente` : 'Frais de scolarité'}</p>
          </CardContent>
        </Card>

        <Card 
          className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group cursor-pointer"
          onClick={() => setCurrentPage('student-courses')}
        >
          <CardContent className="p-4 flex flex-col justify-between h-full min-h-[110px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground truncate">Devoirs</span>
              <FileText className="h-4 w-4 text-purple-500 shrink-0" />
            </div>
            <p className="text-2xl font-bold text-purple-600 mt-1">2 à faire</p>
            <p className="text-[10px] text-muted-foreground truncate mt-1">cette semaine</p>
          </CardContent>
        </Card>
      </div>

      {/* Prochain Cours & Programme du jour */}
      <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-lg">
        <CardContent className="p-5">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">📚 Prochain cours</h3>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-muted/40 p-4 rounded-xl">
            <div>
              <p className="font-bold text-base text-foreground">Mathématiques</p>
              <p className="text-xs text-muted-foreground mt-0.5">Aujourd'hui · 10:30 (Salle B)</p>
            </div>
            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">En cours de préparation</Badge>
          </div>
          <div className="mt-4 pt-3 border-t">
            <h4 className="text-xs font-semibold text-muted-foreground mb-2">➤ Programme du jour</h4>
            <ul className="text-xs space-y-1.5 text-muted-foreground">
              <li className="flex items-center gap-2">🟢 08:30 - Physique-Chimie (Énergie mécanique)</li>
              <li className="flex items-center gap-2">🔵 10:30 - Mathématiques (Algèbre linéaire)</li>
              <li className="flex items-center gap-2">🟡 14:00 - Histoire-Géographie (Géopolitique)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Lessons with subject-colored borders */}
        <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-50">
                <FileText className="h-4 w-4 text-blue-500" />
              </div>
              Leçons récentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lessons.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <div className="p-4 rounded-full bg-blue-50">
                  <BookOpen className="h-10 w-10 text-blue-300" />
                </div>
                <p className="text-sm text-muted-foreground">Aucune leçon disponible pour le moment.</p>
              </div>
            ) : (
              <ScrollArea className="max-h-64">
                <div className="space-y-3">
                  {lessons.map((lesson, index) => {
                    const colorScheme = subjectColors[index % subjectColors.length];
                    return (
                      <div
                        key={lesson.id}
                        className={`flex items-start gap-3 p-4 rounded-xl border-l-4 ${colorScheme.border} bg-accent/20 hover:bg-accent/40 transition-all duration-200 hover:shadow-sm`}
                      >
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${colorScheme.bg} ${colorScheme.text}`}>
                          <BookOpen className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{lesson.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {lesson.course?.name || 'Cours'}
                          </p>
                          <div className="flex items-center gap-1 mt-1.5">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <p className="text-[11px] text-muted-foreground">{formatDate(lesson.createdAt)}</p>
                          </div>
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
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-50">
                <Bell className="h-4 w-4 text-blue-500" />
              </div>
              Notifications récentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentNotifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <div className="p-4 rounded-full bg-blue-50">
                  <Bell className="h-10 w-10 text-blue-300" />
                </div>
                <p className="text-sm text-muted-foreground">Aucune notification pour le moment.</p>
              </div>
            ) : (
              <ScrollArea className="max-h-64">
                <div className="space-y-3">
                  {recentNotifs.map((notif) => (
                    <div
                      key={notif.id}
                      className={`flex items-start gap-3 p-4 rounded-xl border transition-all duration-200 hover:shadow-sm ${
                        notif.read
                          ? 'bg-background border-border'
                          : 'bg-gradient-to-r from-blue-50 to-white border-blue-200'
                      }`}
                    >
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        notif.read ? 'bg-muted' : 'bg-blue-100 text-blue-600'
                      }`}>
                        <Bell className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${notif.read ? 'text-muted-foreground' : 'font-medium'}`}>{notif.message}</p>
                        <div className="flex items-center gap-1 mt-1.5">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <p className="text-[11px] text-muted-foreground">{formatDate(notif.createdAt)}</p>
                        </div>
                      </div>
                      {!notif.read && (
                        <div className="h-2.5 w-2.5 rounded-full bg-blue-500 mt-2 shrink-0 animate-pulse-soft" />
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attendance Trend Chart */}
      {user?.schoolId && <AttendanceTrendChart schoolId={user.schoolId} />}

      {/* Motivational Quote Section */}
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
        <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 p-6 text-white relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-40" />
          <div className="relative z-10 flex items-start gap-4">
            <div className="p-3 rounded-xl bg-white/15 backdrop-blur-sm shrink-0">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <p className="text-base lg:text-lg font-medium leading-relaxed italic">
                &ldquo;{quote.text}&rdquo;
              </p>
              <p className="text-blue-200 text-sm mt-2 font-medium">— {quote.author}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Floating Grady Chat CTA for Mobile */}
      <div className="fixed bottom-20 right-4 z-40 lg:hidden">
        <Button
          onClick={() => setCurrentPage('student-ai')}
          className="rounded-full h-12 w-12 bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform duration-200"
        >
          <Sparkles className="h-6 w-6 animate-pulse-soft" />
        </Button>
      </div>
    </div>
  );
}
