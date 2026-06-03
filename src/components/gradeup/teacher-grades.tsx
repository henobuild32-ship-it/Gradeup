'use client';

import { useState, useEffect, useCallback } from 'react';
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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Edit, Trash2, GraduationCap, Filter, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import type { CourseInfo, GradeInfo, UserInfo } from '@/lib/types';

export default function TeacherGrades() {
  const { user } = useAppStore();
  const [grades, setGrades] = useState<GradeInfo[]>([]);
  const [courses, setCourses] = useState<CourseInfo[]>([]);
  const [students, setStudents] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<GradeInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [filterCourseId, setFilterCourseId] = useState<string>('');
  const [filterTrimester, setFilterTrimester] = useState<string>('');

  const [formCourseId, setFormCourseId] = useState('');
  const [formStudentId, setFormStudentId] = useState('');
  const [formScore, setFormScore] = useState('');
  const [formMaxScore, setFormMaxScore] = useState('20');
  const [formTrimester, setFormTrimester] = useState('');
  const [formComment, setFormComment] = useState('');

  const fetchCourses = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/courses?schoolId=${user.schoolId}&teacherId=${user.id}`);
      const data = await res.json();
      setCourses(Array.isArray(data.courses) ? data.courses : []);
    } catch {
      // silent
    }
  }, [user]);

  const fetchGrades = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let url = `/api/grades?schoolId=${user.schoolId}&teacherId=${user.id}`;
      if (filterCourseId) url += `&courseId=${filterCourseId}`;
      if (filterTrimester) url += `&trimester=${filterTrimester}`;
      const res = await fetch(url);
      const data = await res.json();
      setGrades(Array.isArray(data.grades) ? data.grades : []);
    } catch {
      toast.error('Erreur lors du chargement des notes');
    } finally {
      setLoading(false);
    }
  }, [user, filterCourseId, filterTrimester]);

  const fetchStudents = useCallback(async (courseId: string) => {
    if (!user || !courseId) {
      setStudents([]);
      return;
    }
    try {
      const course = courses.find((c) => c.id === courseId);
      if (!course) return;
      const res = await fetch(`/api/users?schoolId=${user.schoolId}&role=STUDENT&classId=${course.classId}`);
      const data = await res.json();
      setStudents(Array.isArray(data.users) ? data.users : []);
    } catch {
      setStudents([]);
    }
  }, [user, courses]);

  useEffect(() => {
    if (!user) return;
    fetchCourses();
  }, [user, fetchCourses]);

  useEffect(() => {
    fetchGrades();
  }, [fetchGrades]);

  useEffect(() => {
    if (formCourseId) fetchStudents(formCourseId);
  }, [formCourseId, fetchStudents]);

  const resetForm = () => {
    setFormCourseId('');
    setFormStudentId('');
    setFormScore('');
    setFormMaxScore('20');
    setFormTrimester('');
    setFormComment('');
    setEditingGrade(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (grade: GradeInfo) => {
    setEditingGrade(grade);
    setFormCourseId(grade.courseId);
    setFormStudentId(grade.studentId);
    setFormScore(String(grade.score));
    setFormMaxScore(String(grade.maxScore));
    setFormTrimester(grade.trimester);
    setFormComment(grade.comment);
    const course = courses.find((c) => c.id === grade.courseId);
    if (course && user) {
      fetch(`/api/users?schoolId=${user.schoolId}&role=STUDENT&classId=${course.classId}`)
        .then((res) => res.json())
        .then((data) => setStudents(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!user || !formCourseId || !formStudentId || !formScore || !formTrimester) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const score = parseFloat(formScore);
    const maxScore = parseFloat(formMaxScore);
    if (isNaN(score) || isNaN(maxScore) || maxScore <= 0) {
      toast.error('Veuillez saisir des notes valides');
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        schoolId: user.schoolId,
        courseId: formCourseId,
        studentId: formStudentId,
        teacherId: user.id,
        score,
        maxScore,
        trimester: formTrimester,
        comment: formComment.trim(),
      };

      const url = editingGrade ? `/api/grades/${editingGrade.id}` : '/api/grades';
      const method = editingGrade ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Erreur lors de l\'enregistrement');
        return;
      }

      toast.success(editingGrade ? 'Note modifiée avec succès' : 'Note ajoutée avec succès');
      setDialogOpen(false);
      resetForm();
      fetchGrades();
    } catch {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/grades/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        toast.error('Erreur lors de la suppression');
        return;
      }
      toast.success('Note supprimée');
      fetchGrades();
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const getStudentName = (studentId: string) => {
    return grades.find((g) => g.studentId === studentId)?.student?.fullName ||
      students.find((s) => s.id === studentId)?.fullName || 'Inconnu';
  };

  const getCourseName = (courseId: string) => {
    return grades.find((g) => g.courseId === courseId)?.course?.name ||
      courses.find((c) => c.id === courseId)?.name || 'Inconnu';
  };

  const getClassAverage = () => {
    if (grades.length === 0) return '—';
    const total = grades.reduce((sum, g) => sum + (g.score / g.maxScore) * 20, 0);
    return (total / grades.length).toFixed(2);
  };

  const getPassCount = () => grades.filter((g) => (g.score / g.maxScore) * 20 >= 10).length;

  if (!user) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="mb-6 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Gestion des Notes</h1>
            <p className="text-sm text-muted-foreground mt-1">Ajoutez, modifiez et consultez les notes de vos élèves</p>
          </div>
          <Button
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg shadow-blue-500/20 gap-2"
            onClick={openCreateDialog}
          >
            <Plus className="h-4 w-4" />
            Ajouter une note
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="shadow-sm">
        <CardContent className="flex items-center gap-4 flex-wrap py-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterCourseId} onValueChange={(v) => setFilterCourseId(v === '__all__' ? '' : v)}>
            <SelectTrigger className="w-48 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
              <SelectValue placeholder="Tous les cours" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous les cours</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterTrimester} onValueChange={(v) => setFilterTrimester(v === '__all__' ? '' : v)}>
            <SelectTrigger className="w-40 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
              <SelectValue placeholder="Trimestre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous les trimestres</SelectItem>
              <SelectItem value="1">Trimestre 1</SelectItem>
              <SelectItem value="2">Trimestre 2</SelectItem>
              <SelectItem value="3">Trimestre 3</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calculator className="h-4 w-4 text-blue-500" />
              Moyenne: <strong className="text-foreground">{getClassAverage()}</strong>/20
            </span>
            <span>Au-dessus de 10: <strong className="text-emerald-600">{getPassCount()}</strong>/{grades.length}</span>
          </div>
        </CardContent>
      </Card>

      {/* Grades Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      ) : grades.length === 0 ? (
        <div className="text-center py-20">
          <div className="mx-auto w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <GraduationCap className="h-12 w-12 text-muted-foreground/50" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Aucune note enregistrée</h3>
          <p className="text-muted-foreground mb-4">Ajoutez des notes pour vos élèves</p>
          <Button onClick={openCreateDialog} variant="outline" className="hover:scale-[1.02] active:scale-[0.98] transition-all gap-2">
            <Plus className="h-4 w-4" />
            Ajouter une note
          </Button>
        </div>
      ) : (
        <Card className="shadow-sm">
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead>Élève</TableHead>
                  <TableHead>Cours</TableHead>
                  <TableHead className="text-center">Note</TableHead>
                  <TableHead className="text-center">Note max</TableHead>
                  <TableHead>Trimestre</TableHead>
                  <TableHead className="hidden sm:table-cell">Commentaire</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.map((grade) => {
                  const normalizedScore = (grade.score / grade.maxScore) * 20;
                  return (
                    <TableRow key={grade.id} className="even:bg-muted/20 hover:bg-blue-50/50 transition-colors">
                      <TableCell className="font-medium">
                        {grade.student?.fullName || getStudentName(grade.studentId)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {grade.course?.name || getCourseName(grade.courseId)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-flex items-center justify-center rounded-lg px-3 py-1 text-sm font-bold shadow-sm ${
                            normalizedScore >= 10
                              ? 'bg-emerald-100 text-emerald-700'
                              : normalizedScore >= 7
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {grade.score}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">{grade.maxScore}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs border-blue-200 text-blue-600 bg-blue-50">T{grade.trimester}</Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell max-w-[200px] truncate text-muted-foreground text-xs">
                        {grade.comment || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600 transition-colors" onClick={() => openEditDialog(grade)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50 hover:text-red-600 transition-colors" onClick={() => handleDelete(grade.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Average Row */}
                <TableRow className="bg-gradient-to-r from-blue-50 to-indigo-50 font-bold">
                  <TableCell colSpan={2} className="text-blue-700">Moyenne</TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-sm">
                      {getClassAverage()}/20
                    </Badge>
                  </TableCell>
                  <TableCell colSpan={4}></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      {/* Create/Edit Grade Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="sm:max-w-lg">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-t-lg -mx-6 -mt-6 mb-0" />
          <DialogHeader className="pt-2">
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-blue-500" />
              {editingGrade ? 'Modifier la note' : 'Ajouter une note'}
            </DialogTitle>
            <DialogDescription>
              {editingGrade ? 'Modifiez les informations de la note' : 'Enregistrez une nouvelle note pour un élève'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cours *</Label>
              <Select value={formCourseId} onValueChange={(v) => { setFormCourseId(v); setFormStudentId(''); }}>
                <SelectTrigger className="w-full focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
                  <SelectValue placeholder="Sélectionner un cours" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} — {c.class?.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Élève *</Label>
              <Select value={formStudentId} onValueChange={setFormStudentId} disabled={!formCourseId}>
                <SelectTrigger className="w-full focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
                  <SelectValue placeholder={formCourseId ? 'Sélectionner un élève' : 'Sélectionnez d\'abord un cours'} />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Note *</Label>
                <Input type="number" placeholder="0" min="0" max={formMaxScore} step="0.25" value={formScore} onChange={(e) => setFormScore(e.target.value)} className="focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
              </div>
              <div className="space-y-2">
                <Label>Note max</Label>
                <Input type="number" placeholder="20" min="1" value={formMaxScore} onChange={(e) => setFormMaxScore(e.target.value)} className="focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Trimestre *</Label>
              <Select value={formTrimester} onValueChange={setFormTrimester}>
                <SelectTrigger className="w-full focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
                  <SelectValue placeholder="Sélectionner le trimestre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Trimestre 1</SelectItem>
                  <SelectItem value="2">Trimestre 2</SelectItem>
                  <SelectItem value="3">Trimestre 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Commentaire</Label>
              <Textarea placeholder="Commentaire sur la performance..." value={formComment} onChange={(e) => setFormComment(e.target.value)} rows={3} className="focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }} className="hover:scale-[1.02] active:scale-[0.98] transition-all">Annuler</Button>
            <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:scale-[1.02] active:scale-[0.98] transition-transform" onClick={handleSubmit} disabled={submitting || !formCourseId || !formStudentId || !formScore || !formTrimester}>
              {submitting ? 'Enregistrement...' : editingGrade ? 'Modifier' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
