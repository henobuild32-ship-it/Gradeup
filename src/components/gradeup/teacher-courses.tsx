'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Users, FileText, BarChart3, Eye } from 'lucide-react';
import { toast } from 'sonner';
import type { CourseInfo, UserInfo, GradeInfo } from '@/lib/types';

export default function TeacherCourses() {
  const { user } = useAppStore();
  const [courses, setCourses] = useState<CourseInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<CourseInfo | null>(null);
  const [students, setStudents] = useState<UserInfo[]>([]);
  const [grades, setGrades] = useState<GradeInfo[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchCourses();
  }, [user]);

  const fetchCourses = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/courses?schoolId=${user.schoolId}&teacherId=${user.id}`);
      const data = await res.json();
      setCourses(Array.isArray(data.courses) ? data.courses : []);
    } catch {
      toast.error('Erreur lors du chargement des cours');
    } finally {
      setLoading(false);
    }
  };

  const openCourseDetail = async (course: CourseInfo) => {
    setSelectedCourse(course);
    setDetailLoading(true);
    try {
      const [studentsRes, gradesRes] = await Promise.all([
        fetch(`/api/users?schoolId=${user?.schoolId}&role=STUDENT&classId=${course.classId}`),
        fetch(`/api/grades?schoolId=${user?.schoolId}&courseId=${course.id}`),
      ]);
      const studentsData = await studentsRes.json();
      const gradesData = await gradesRes.json();
      setStudents(Array.isArray(studentsData) ? studentsData : []);
      setGrades(Array.isArray(gradesData) ? gradesData : []);
    } catch {
      toast.error('Erreur lors du chargement des détails');
    } finally {
      setDetailLoading(false);
    }
  };

  const getAverageForStudent = (studentId: string) => {
    const studentGrades = grades.filter((g) => g.studentId === studentId);
    if (studentGrades.length === 0) return null;
    const total = studentGrades.reduce((sum, g) => {
      return sum + (g.score / g.maxScore) * 20;
    }, 0);
    return (total / studentGrades.length).toFixed(1);
  };

  const getClassAverage = () => {
    if (grades.length === 0) return null;
    const total = grades.reduce((sum, g) => {
      return sum + (g.score / g.maxScore) * 20;
    }, 0);
    return (total / grades.length).toFixed(1);
  };

  if (!user) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="mb-6 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-6">
        <h1 className="text-2xl font-bold">Mes Cours</h1>
        <p className="text-sm text-muted-foreground mt-1">Gérez et consultez vos cours assignés</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-20">
          <div className="mx-auto w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <BookOpen className="h-12 w-12 text-muted-foreground/50" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Aucun cours assigné</h3>
          <p className="text-muted-foreground">Veuillez contacter l&apos;administrateur pour l&apos;attribution de cours</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <Card
              key={course.id}
              className="hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer border-l-4 border-l-blue-500 hover:border-l-blue-600"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600 shadow-sm">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">{course.class?.name}</Badge>
                </div>
                <CardTitle className="text-lg mt-3">{course.name}</CardTitle>
                {course.description && (
                  <CardDescription className="line-clamp-2">{course.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    <span>{course.class?._count?.enrollments || 0} élèves</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-4 w-4" />
                    <span>{course._count?.lessons || 0} leçons</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <BarChart3 className="h-4 w-4" />
                    <span>{course._count?.grades || 0} notes</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  onClick={() => openCourseDetail(course)}
                >
                  <Eye className="h-4 w-4" />
                  Voir détails
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Course Detail Dialog */}
      <Dialog open={!!selectedCourse} onOpenChange={(open) => !open && setSelectedCourse(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-t-lg -mx-6 -mt-6 mb-0" />
          <DialogHeader className="pt-2">
            <DialogTitle className="text-xl flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-500" />
              {selectedCourse?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedCourse?.class?.name} — {selectedCourse?.description || 'Aucune description'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-blue-50 text-center border border-blue-100">
                <p className="text-2xl font-bold text-blue-600">
                  {selectedCourse?._count?.lessons || 0}
                </p>
                <p className="text-xs text-blue-600/80">Leçons</p>
              </div>
              <div className="p-3 rounded-lg bg-indigo-50 text-center border border-indigo-100">
                <p className="text-2xl font-bold text-indigo-600">
                  {selectedCourse?._count?.grades || 0}
                </p>
                <p className="text-xs text-indigo-600/80">Notes</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 text-center border border-emerald-100">
                <p className="text-2xl font-bold text-emerald-600">
                  {getClassAverage() || '—'}
                </p>
                <p className="text-xs text-emerald-600/80">Moyenne</p>
              </div>
            </div>

            {/* Students */}
            <div>
              <h3 className="font-semibold text-sm mb-2">Élèves inscrits</h3>
              {detailLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-md" />
                  ))}
                </div>
              ) : students.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun élève inscrit</p>
              ) : (
                <ScrollArea className="max-h-64">
                  <div className="space-y-1.5">
                    {students.map((student) => {
                      const avg = getAverageForStudent(student.id);
                      return (
                        <div
                          key={student.id}
                          className="flex items-center justify-between p-2.5 rounded-lg border bg-accent/20 hover:bg-accent/40 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-blue-100 text-xs font-bold shadow-sm">
                              {student.fullName.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium">{student.fullName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {avg !== null ? (
                              <Badge
                                variant="secondary"
                                className={
                                  parseFloat(avg) >= 10
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : parseFloat(avg) >= 7
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-red-100 text-red-700'
                                }
                              >
                                {avg}/20
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">Pas de note</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
