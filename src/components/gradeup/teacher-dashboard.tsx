'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Users, FileText, Plus, GraduationCap, Clock } from 'lucide-react';
import type { CourseInfo, LessonInfo, UserInfo } from '@/lib/types';

export default function TeacherDashboard() {
  const { user } = useAppStore();
  const [courses, setCourses] = useState<CourseInfo[]>([]);
  const [lessons, setLessons] = useState<LessonInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalStudents, setTotalStudents] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [coursesRes, lessonsRes] = await Promise.all([
        fetch(`/api/courses?schoolId=${user.schoolId}&teacherId=${user.id}`),
        fetch(`/api/lessons?schoolId=${user.schoolId}&teacherId=${user.id}`),
      ]);
      const coursesData = await coursesRes.json();
      const lessonsData = await lessonsRes.json();

      setCourses(coursesData || []);
      setLessons(lessonsData || []);

      // Count unique students across all courses
      const classIds = [...new Set((coursesData || []).map((c: CourseInfo) => c.classId))];
      let total = 0;
      for (const classId of classIds) {
        const studentsRes = await fetch(`/api/users?schoolId=${user.schoolId}&role=STUDENT&classId=${classId}`);
        const studentsData = await studentsRes.json();
        total += (studentsData || []).length;
      }
      setTotalStudents(total);
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const todayLessons = lessons.filter((l) => l.createdAt?.startsWith(today));
  const recentLessons = [...lessons]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const todayStr = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Bonjour, {user.fullName} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Bienvenue sur votre tableau de bord — {todayStr}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Mes cours</p>
              <p className="text-2xl font-bold">
                {loading ? <Skeleton className="h-8 w-8 inline-block" /> : courses.length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Mes élèves</p>
              <p className="text-2xl font-bold">
                {loading ? <Skeleton className="h-8 w-8 inline-block" /> : totalStudents}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Leçons aujourd&apos;hui</p>
              <p className="text-2xl font-bold">
                {loading ? <Skeleton className="h-8 w-8 inline-block" /> : todayLessons.length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Activité récente
            </CardTitle>
            <CardDescription>Vos dernières leçons publiées</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : recentLessons.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>Aucune activité récente</p>
              </div>
            ) : (
              <ScrollArea className="max-h-96">
                <div className="space-y-3">
                  {recentLessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-accent/30 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{lesson.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {lesson.course?.name}
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        {new Date(lesson.createdAt).toLocaleDateString('fr-FR')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-blue-500" />
              Actions rapides
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full justify-start gap-3 bg-blue-600 hover:bg-blue-700"
              onClick={() => useAppStore.getState().setCurrentPage('teacher-lessons')}
            >
              <Plus className="h-4 w-4" />
              Publier une leçon
            </Button>
            <Button
              className="w-full justify-start gap-3 bg-blue-600 hover:bg-blue-700"
              onClick={() => useAppStore.getState().setCurrentPage('teacher-grades')}
            >
              <GraduationCap className="h-4 w-4" />
              Ajouter des notes
            </Button>
            <Button
              className="w-full justify-start gap-3 variant-outline border-blue-200 text-blue-700 hover:bg-blue-50"
              variant="outline"
              onClick={() => useAppStore.getState().setCurrentPage('teacher-homework')}
            >
              <BookOpen className="h-4 w-4" />
              Créer un devoir
            </Button>
            <Button
              className="w-full justify-start gap-3 variant-outline border-blue-200 text-blue-700 hover:bg-blue-50"
              variant="outline"
              onClick={() => useAppStore.getState().setCurrentPage('teacher-attendance')}
            >
              <Users className="h-4 w-4" />
              Appel du jour
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
