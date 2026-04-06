'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import type { CourseInfo, GradeInfo, AttendanceInfo, PaymentInfo, LessonInfo, NotificationInfo } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingUp, BookOpen, CalendarX, CreditCard, User, Bell, FileText, Clock } from 'lucide-react';

export default function StudentDashboard() {
  const user = useAppStore((s) => s.user);
  const [courses, setCourses] = useState<CourseInfo[]>([]);
  const [grades, setGrades] = useState<GradeInfo[]>([]);
  const [attendance, setAttendance] = useState<AttendanceInfo[]>([]);
  const [payments, setPayments] = useState<PaymentInfo[]>([]);
  const [lessons, setLessons] = useState<LessonInfo[]>([]);
  const [notifications, setNotifications] = useState<NotificationInfo[]>([]);
  const [loading, setLoading] = useState(true);

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
        setNotifications(Array.isArray(notifsRes) ? notifsRes : []);
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
              if (Array.isArray(data)) allLessons.push(...data);
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

  if (loading) {
    return (
      <div className="space-y-6">
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
    <div className="space-y-6">
      {/* Profile Card */}
      <Card>
        <CardContent className="flex items-center gap-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <User className="h-8 w-8" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold">{user?.fullName}</h2>
              <Badge className="bg-blue-600 text-white">Élève</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Classe : <span className="font-medium text-foreground">{className}</span>
            </p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </CardContent>
      </Card>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <CardDescription>Moyenne générale</CardDescription>
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-blue-600">
              {grades.length > 0 ? generalAverage.toFixed(1) : '—'}
            </p>
            <p className="text-xs text-muted-foreground">sur 20</p>
            {grades.length > 0 && (
              <Progress value={generalAverage} className="h-2" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <CardDescription>Mes cours</CardDescription>
              <BookOpen className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold">{courses.length}</p>
            <p className="text-xs text-muted-foreground">cours assignés</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <CardDescription>Mes absences</CardDescription>
              <CalendarX className="h-5 w-5 text-red-500" />
            </div>
            <p className="text-3xl font-bold text-red-600">{absenceCount}</p>
            <p className="text-xs text-muted-foreground">jour(s) absent</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <CardDescription>Paiements en attente</CardDescription>
              <CreditCard className="h-5 w-5 text-yellow-500" />
            </div>
            <p className="text-3xl font-bold text-yellow-600">{pendingPayments}</p>
            <p className="text-xs text-muted-foreground">paiement(s)</p>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Lessons */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              Leçons récentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lessons.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucune leçon disponible pour le moment.
              </p>
            ) : (
              <ScrollArea className="max-h-64">
                <div className="space-y-3">
                  {lessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{lesson.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {lesson.course?.name || 'Cours'}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">{formatDate(lesson.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Recent Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-500" />
              Notifications récentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentNotifs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucune notification pour le moment.
              </p>
            ) : (
              <ScrollArea className="max-h-64">
                <div className="space-y-3">
                  {recentNotifs.map((notif) => (
                    <div
                      key={notif.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                        notif.read ? 'bg-background' : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                        <Bell className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{notif.message}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">{formatDate(notif.createdAt)}</p>
                        </div>
                      </div>
                      {!notif.read && (
                        <div className="h-2 w-2 rounded-full bg-blue-600 mt-2 shrink-0" />
                      )}
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
