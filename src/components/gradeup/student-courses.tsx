'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import type { CourseInfo, LessonInfo } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, User, GraduationCap, FileText, ChevronLeft, X } from 'lucide-react';

export default function StudentCourses() {
  const user = useAppStore((s) => s.user);
  const [courses, setCourses] = useState<CourseInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<CourseInfo | null>(null);
  const [lessons, setLessons] = useState<LessonInfo[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(false);

  const classId = user?.classEnrollments?.[0]?.classId;

  useEffect(() => {
    if (!user?.schoolId || !classId) return;
    const fetchCourses = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/courses?schoolId=${user.schoolId}&classId=${classId}`);
        const data = await res.json();
        setCourses(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Erreur chargement cours:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [user?.schoolId, classId]);

  const handleViewCourse = async (course: CourseInfo) => {
    setSelectedCourse(course);
    setLoadingLessons(true);
    try {
      const res = await fetch(`/api/lessons?schoolId=${user!.schoolId}&courseId=${course.id}`);
      const data = await res.json();
      const sorted = (Array.isArray(data) ? data : []).sort(
        (a: LessonInfo, b: LessonInfo) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setLessons(sorted);
    } catch (err) {
      console.error('Erreur chargement leçons:', err);
      setLessons([]);
    } finally {
      setLoadingLessons(false);
    }
  };

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
        <h1 className="text-2xl font-bold">Mes cours</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Course detail view
  if (selectedCourse) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedCourse(null)}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Retour
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">{selectedCourse.name}</CardTitle>
                <CardDescription className="mt-1">
                  {selectedCourse.teacher?.fullName || 'Enseignant non assigné'}
                </CardDescription>
              </div>
              <Badge className="bg-blue-600 text-white">{selectedCourse.class?.name}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {selectedCourse.description && (
              <p className="text-sm text-muted-foreground mb-4">{selectedCourse.description}</p>
            )}
            <p className="text-sm font-medium">
              <FileText className="h-4 w-4 inline mr-1" />
              {lessons.length} leçon(s) disponible(s)
            </p>
          </CardContent>
        </Card>

        <div>
          <h3 className="text-lg font-semibold mb-3">Leçons du cours</h3>
          {loadingLessons ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : lessons.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Aucune leçon disponible pour ce cours.</p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="max-h-96">
              <div className="space-y-3">
                {lessons.map((lesson) => (
                  <Card key={lesson.id}>
                    <CardContent className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{lesson.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {lesson.content.length > 100
                            ? lesson.content.substring(0, 100) + '...'
                            : lesson.content}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {formatDate(lesson.createdAt)}
                          </Badge>
                          {lesson.fileUrl && (
                            <Badge variant="outline" className="text-xs">
                              📎 Pièce jointe
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    );
  }

  // Course grid
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mes cours</h1>
        <p className="text-muted-foreground mt-1">
          {courses.length} cours dans votre classe
        </p>
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium">Aucun cours disponible</p>
            <p className="text-sm text-muted-foreground mt-1">
              Vous n'êtes inscrit à aucun cours pour le moment.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <Card
              key={course.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleViewCourse(course)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <Badge variant="secondary">{course.class?.name}</Badge>
                </div>
                <CardTitle className="mt-3 text-lg">{course.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>{course.teacher?.fullName || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <GraduationCap className="h-4 w-4" />
                    <span>{course.class?.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>{course._count?.lessons || 0} leçon(s)</span>
                  </div>
                </div>
                {course.description && (
                  <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                    {course.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
