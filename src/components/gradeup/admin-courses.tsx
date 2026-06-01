'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import type { ClassInfo, CourseInfo, UserInfo } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  BookOpen,
  Plus,
  Trash2,
  GraduationCap,
  Users,
  FileText,
  BarChart3,
  User,
  School,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminCourses() {
  const { user } = useAppStore();
  const [courses, setCourses] = useState<CourseInfo[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [teachers, setTeachers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.schoolId) return;
    setLoading(true);
    try {
      const [coursesRes, classesRes, teachersRes] = await Promise.all([
        fetch(`/api/courses?schoolId=${user.schoolId}`),
        fetch(`/api/classes?schoolId=${user.schoolId}`),
        fetch(`/api/users?schoolId=${user.schoolId}&role=TEACHER`),
      ]);

      const coursesData = await coursesRes.json();
      const classesData = await classesRes.json();
      const teachersData = await teachersRes.json();

      setCourses(Array.isArray(coursesData.courses) ? coursesData.courses : Array.isArray(coursesData) ? coursesData : []);
      setClasses(Array.isArray(classesData) ? classesData : Array.isArray(classesData.classes) ? classesData.classes : []);
      setTeachers(Array.isArray(teachersData.users) ? teachersData.users : []);
    } catch {
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [user?.schoolId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateCourse = async () => {
    if (!newCourseName.trim() || !selectedClassId || !selectedTeacherId) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: user?.schoolId,
          classId: selectedClassId,
          teacherId: selectedTeacherId,
          name: newCourseName.trim(),
          description: newCourseDesc.trim(),
        }),
      });
      if (!res.ok) throw new Error('Erreur lors de la création');
      toast.success('Cours créé et distribué au professeur avec succès !');
      setShowCreate(false);
      setNewCourseName('');
      setNewCourseDesc('');
      setSelectedClassId('');
      setSelectedTeacherId('');
      fetchData();
    } catch {
      toast.error('Erreur lors de la création du cours');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Supprimer ce cours ? Cette action est irréversible.')) return;
    try {
      const res = await fetch(`/api/courses/${courseId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erreur de suppression');
      toast.success('Cours supprimé');
      fetchData();
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const getTeacherName = (teacherId: string) => {
    const t = teachers.find((t) => t.id === teacherId);
    return t?.fullName || 'Inconnu';
  };

  const getClassName = (classId: string) => {
    const c = classes.find((c) => c.id === classId);
    return c?.name || 'Inconnue';
  };

  if (!user) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 p-6 lg:p-8 text-white shadow-xl shadow-blue-500/20">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wOCkiLz48L3N2Zz4=')] opacity-50" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-white/15 backdrop-blur-sm">
            <BookOpen className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Gestion des Cours</h1>
            <p className="text-blue-100 text-sm">
              {courses.length} cours · {teachers.length} professeurs · {classes.length} classes
            </p>
          </div>
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-white text-blue-700 hover:bg-blue-50 hover:scale-[1.02] active:scale-[0.98] shadow-lg transition-all"
          >
            <Plus className="h-4 w-4 mr-2" />
            Distribuer un cours
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100">
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Cours</p>
              <p className="text-xl font-bold">{courses.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Professeurs</p>
              <p className="text-xl font-bold">{teachers.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100">
              <School className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Classes concernées</p>
              <p className="text-xl font-bold">{new Set(courses.map(c => c.classId)).size}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Courses List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-20">
          <div className="mx-auto w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <BookOpen className="h-12 w-12 text-muted-foreground/50" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Aucun cours</h3>
          <p className="text-muted-foreground mb-6">
            Commencez par distribuer un cours à un professeur
          </p>
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-md"
          >
            <Plus className="h-4 w-4 mr-2" />
            Distribuer un cours
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => (
            <Card
              key={course.id}
              className="group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 border-l-4 border-l-blue-500"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600 shadow-sm">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-lg truncate">{course.name}</h3>
                        <Badge className="bg-blue-100 text-blue-700">{getClassName(course.classId)}</Badge>
                      </div>
                      {course.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{course.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <User className="h-4 w-4 text-emerald-500" />
                          <span className="font-medium text-emerald-700">{getTeacherName(course.teacherId)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-4 w-4" />
                          <span>{course._count?.lessons || 0} leçons</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <BarChart3 className="h-4 w-4" />
                          <span>{course._count?.grades || 0} notes</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <GraduationCap className="h-4 w-4" />
                          <span>{course._count?.homework || 0} devoirs</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteCourse(course.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 hover:bg-red-50 transition-all shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Course Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="p-1.5 rounded-lg bg-blue-50">
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
              Distribuer un cours
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="course-class">Classe cible *</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger id="course-class">
                  <SelectValue placeholder="Sélectionnez une classe..." />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      <span className="flex items-center gap-2">
                        <School className="h-3.5 w-3.5" /> {cls.name} ({cls.level})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="course-teacher">Professeur *</Label>
              <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                <SelectTrigger id="course-teacher">
                  <SelectValue placeholder="Sélectionnez un professeur..." />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <span className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5" /> {t.fullName}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="course-name">Nom du cours *</Label>
              <Input
                id="course-name"
                value={newCourseName}
                onChange={(e) => setNewCourseName(e.target.value)}
                placeholder="Ex: Mathématiques, Physique, Français..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="course-desc">Description (optionnelle)</Label>
              <Textarea
                id="course-desc"
                value={newCourseDesc}
                onChange={(e) => setNewCourseDesc(e.target.value)}
                placeholder="Description du cours..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleCreateCourse}
              disabled={creating || !newCourseName.trim() || !selectedClassId || !selectedTeacherId}
              className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-md"
            >
              {creating ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {creating ? 'Création...' : 'Distribuer le cours'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
