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
import { Plus, Edit, Trash2, BookOpen, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { CourseInfo, HomeworkInfo } from '@/lib/types';

export default function TeacherHomework() {
  const { user } = useAppStore();
  const [homeworkList, setHomeworkList] = useState<HomeworkInfo[]>([]);
  const [courses, setCourses] = useState<CourseInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHomework, setEditingHomework] = useState<HomeworkInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formCourseId, setFormCourseId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDueDate, setFormDueDate] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [homeworkRes, coursesRes] = await Promise.all([
        fetch(`/api/homework?schoolId=${user.schoolId}&teacherId=${user.id}`),
        fetch(`/api/courses?schoolId=${user.schoolId}&teacherId=${user.id}`),
      ]);
      const homeworkData = await homeworkRes.json();
      const coursesData = await coursesRes.json();
      setHomeworkList(homeworkData || []);
      setCourses(coursesData || []);
    } catch {
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const getDaysRemaining = (dueDate: string): number => {
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diff = due.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const resetForm = () => {
    setFormCourseId('');
    setFormTitle('');
    setFormDescription('');
    setFormDueDate('');
    setEditingHomework(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (hw: HomeworkInfo) => {
    setEditingHomework(hw);
    setFormCourseId(hw.courseId);
    setFormTitle(hw.title);
    setFormDescription(hw.description);
    setFormDueDate(hw.dueDate.split('T')[0]);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!user || !formCourseId || !formTitle.trim() || !formDueDate) {
      toast.error('Veuillez remplir le titre, le cours et la date limite');
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        schoolId: user.schoolId,
        courseId: formCourseId,
        teacherId: user.id,
        title: formTitle.trim(),
        description: formDescription.trim(),
        dueDate: formDueDate,
      };

      const url = editingHomework ? `/api/homework/${editingHomework.id}` : '/api/homework';
      const method = editingHomework ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Erreur lors de l'enregistrement");
        return;
      }

      toast.success(editingHomework ? 'Devoir modifié avec succès' : 'Devoir créé avec succès');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/homework/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        toast.error('Erreur lors de la suppression');
        return;
      }
      toast.success('Devoir supprimé');
      fetchData();
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const sortedHomework = [...homeworkList].sort((a, b) => {
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const getCourseName = (courseId: string) => {
    return courses.find((c) => c.id === courseId)?.name || 'Cours inconnu';
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Devoirs</h1>
          <p className="text-muted-foreground mt-1">
            Créez et gérez les devoirs de vos élèves
          </p>
        </div>
        <Button
          className="bg-blue-600 hover:bg-blue-700 gap-2"
          onClick={openCreateDialog}
        >
          <Plus className="h-4 w-4" />
          Créer un devoir
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : sortedHomework.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Aucun devoir créé</p>
            <Button
              variant="outline"
              className="mt-4 gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
              onClick={openCreateDialog}
            >
              <Plus className="h-4 w-4" />
              Créer votre premier devoir
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedHomework.map((hw) => {
            const daysRemaining = getDaysRemaining(hw.dueDate);
            const isOverdue = daysRemaining < 0;
            const isClose = daysRemaining >= 0 && daysRemaining <= 3;
            const isCompleted = daysRemaining < -30;

            return (
              <Card
                key={hw.id}
                className={`hover:shadow-md transition-shadow ${
                  isOverdue
                    ? 'border-l-4 border-l-red-500'
                    : isClose
                    ? 'border-l-4 border-l-yellow-500'
                    : 'border-l-4 border-l-blue-500'
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <Badge variant="secondary" className="text-xs mb-2">
                        {getCourseName(hw.courseId)}
                      </Badge>
                      <CardTitle className="text-base">{hw.title}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                        onClick={() => openEditDialog(hw)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(hw.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {hw.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {hw.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(hw.dueDate).toLocaleDateString('fr-FR')}</span>
                    </div>

                    {isOverdue ? (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Expiré
                      </Badge>
                    ) : isClose ? (
                      <Badge className="text-xs bg-yellow-100 text-yellow-700 border-yellow-300">
                        <Clock className="h-3 w-3 mr-1" />
                        {daysRemaining === 0 ? "C'est aujourd'hui" : `${daysRemaining} jour(s) restant(s)`}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                        {daysRemaining} jour(s)
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Homework Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-500" />
              {editingHomework ? 'Modifier le devoir' : 'Créer un devoir'}
            </DialogTitle>
            <DialogDescription>
              {editingHomework
                ? 'Modifiez les informations du devoir'
                : 'Attribuez un nouveau devoir à vos élèves'}
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
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} — {c.class?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Titre *</Label>
              <Input
                placeholder="Titre du devoir"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Décrivez le devoir à réaliser..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Date limite *</Label>
              <Input
                type="date"
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
              Annuler
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleSubmit}
              disabled={submitting || !formCourseId || !formTitle.trim() || !formDueDate}
            >
              {submitting ? 'Enregistrement...' : editingHomework ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
