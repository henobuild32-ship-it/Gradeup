'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, FileText, Trash2, AlertTriangle, Upload, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import type { CourseInfo, LessonInfo } from '@/lib/types';

export default function TeacherLessons() {
  const { user } = useAppStore();
  const [lessons, setLessons] = useState<LessonInfo[]>([]);
  const [courses, setCourses] = useState<CourseInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formCourseId, setFormCourseId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formFileName, setFormFileName] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [lessonsRes, coursesRes] = await Promise.all([
        fetch(`/api/lessons?schoolId=${user.schoolId}&teacherId=${user.id}`),
        fetch(`/api/courses?schoolId=${user.schoolId}&teacherId=${user.id}`),
      ]);
      const lessonsData = await lessonsRes.json();
      const coursesData = await coursesRes.json();
      setLessons(lessonsData || []);
      setCourses(coursesData || []);
    } catch {
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const todayLessons = lessons.filter((l) => l.createdAt?.startsWith(today));
  const lessonsRemaining = 3 - todayLessons.length;
  const isNearLimit = lessonsRemaining === 1;
  const isAtLimit = lessonsRemaining <= 0;

  const resetForm = () => {
    setFormCourseId('');
    setFormTitle('');
    setFormContent('');
    setFormFileName('');
  };

  const handleCreate = async () => {
    if (!user || !formCourseId || !formTitle.trim()) {
      toast.error('Veuillez remplir le titre et sélectionner un cours');
      return;
    }
    if (isAtLimit) {
      toast.error('Limite de 3 leçons par jour atteinte');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: user.schoolId,
          courseId: formCourseId,
          teacherId: user.id,
          title: formTitle.trim(),
          content: formContent.trim(),
          fileName: formFileName.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Erreur lors de la création');
        return;
      }

      toast.success('Leçon publiée avec succès');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch {
      toast.error('Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/lessons/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        toast.error('Erreur lors de la suppression');
        return;
      }
      toast.success('Leçon supprimée');
      fetchData();
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const sortedLessons = [...lessons].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const getCourseName = (courseId: string) => {
    return courses.find((c) => c.id === courseId)?.name || 'Cours inconnu';
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mes Leçons</h1>
          <p className="text-muted-foreground mt-1">
            Publiez et gérez vos leçons quotidiennes
          </p>
        </div>
        <Button
          className="bg-blue-600 hover:bg-blue-700 gap-2"
          onClick={() => setDialogOpen(true)}
          disabled={isAtLimit}
        >
          <Plus className="h-4 w-4" />
          Publier une leçon
        </Button>
      </div>

      {/* Limit Warning */}
      {(isNearLimit || isAtLimit) && (
        <Alert
          variant={isAtLimit ? 'destructive' : 'default'}
          className={isAtLimit ? '' : 'border-yellow-300 bg-yellow-50 text-yellow-800'}
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {isAtLimit
              ? 'Vous avez atteint la limite de 3 leçons pour aujourd\'hui.'
              : `Attention : il ne vous reste plus qu'une seule leçon pour aujourd'hui.`}
          </AlertDescription>
        </Alert>
      )}

      {/* Lessons List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : sortedLessons.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Aucune leçon publiée</p>
            <Button
              variant="outline"
              className="mt-4 gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Publier votre première leçon
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          <div className="absolute left-[18px] top-0 bottom-0 w-0.5 bg-blue-100" />
          <ScrollArea className="max-h-[600px]">
            <div className="space-y-4 pl-10 relative">
              {sortedLessons.map((lesson, index) => (
                <div key={lesson.id} className="relative">
                  {/* Timeline dot */}
                  <div className="absolute -left-10 top-4 h-[18px] w-[18px] rounded-full border-4 border-blue-500 bg-white z-10" />
                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge variant="secondary" className="text-xs">
                              <BookOpen className="h-3 w-3 mr-1" />
                              {getCourseName(lesson.courseId)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(lesson.createdAt).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <CardTitle className="text-base">{lesson.title}</CardTitle>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0"
                          onClick={() => handleDelete(lesson.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {lesson.content && (
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {lesson.content}
                        </p>
                      )}
                      {lesson.fileName && (
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <Upload className="h-3 w-3" />
                          {lesson.fileName}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Create Lesson Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-blue-500" />
              Publier une leçon
            </DialogTitle>
            <DialogDescription>
              Partagez du contenu avec vos élèves
              {lessonsRemaining > 0 && (
                <span className="block mt-1 text-xs">
                  {lessonsRemaining} leçon(s) restante(s) aujourd&apos;hui
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cours *</Label>
              <Select value={formCourseId} onValueChange={setFormCourseId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner un cours" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name} — {course.class?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Titre *</Label>
              <Input
                placeholder="Titre de la leçon"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Contenu</Label>
              <Textarea
                placeholder="Rédigez le contenu de votre leçon..."
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={5}
              />
            </div>

            <div className="space-y-2">
              <Label>Fichier (nom)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Nom du fichier (ex: cours_chap3.pdf)"
                  value={formFileName}
                  onChange={(e) => setFormFileName(e.target.value)}
                />
                <Button type="button" variant="outline" size="icon" className="shrink-0">
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Saisissez le nom du fichier à joindre
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
              Annuler
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleCreate}
              disabled={submitting || !formCourseId || !formTitle.trim()}
            >
              {submitting ? 'Publication...' : 'Publier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
