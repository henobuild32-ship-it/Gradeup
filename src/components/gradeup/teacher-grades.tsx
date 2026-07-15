'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Edit, Trash2, GraduationCap, Filter, Calculator, Sparkles, Check, Zap, RefreshCw } from 'lucide-react';
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
  const [filterTrimester, setFilterTrimester] = useState<string>('1');

  // Quick grading grid states
  const [gridStudents, setGridStudents] = useState<UserInfo[]>([]);
  const [gridScores, setGridScores] = useState<Record<string, string>>({});
  const [gridComments, setGridComments] = useState<Record<string, string>>({});

  const [formCourseId, setFormCourseId] = useState('');
  const [formStudentId, setFormStudentId] = useState('');
  const [formScore, setFormScore] = useState('');
  const [formMaxScore, setFormMaxScore] = useState('20');
  const [formTrimester, setFormTrimester] = useState('1');
  const [formComment, setFormComment] = useState('');
  const [formReason, setFormReason] = useState('');
  const [gradeHistoryList, setGradeHistoryList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Sync state: tracks the last auto-sync event for the banner
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [lastSyncInfo, setLastSyncInfo] = useState<{ student: string; trimester: string; average: number } | null>(null);
  const [syncVisible, setSyncVisible] = useState(false);

  const showSyncBanner = (studentName: string, trimester: string, average: number) => {
    setLastSyncedAt(new Date());
    setLastSyncInfo({ student: studentName, trimester, average });
    setSyncVisible(true);
    // Auto-hide after 5 seconds
    setTimeout(() => setSyncVisible(false), 5000);
  };

  const fetchCourses = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/courses?schoolId=${user.schoolId}&teacherId=${user.id}`);
      const data = await res.json();
      setCourses(Array.isArray(data.courses) ? data.courses : []);
    } catch { /* silent */ }
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

  // Load students for grid mode when course/trimester changes
  useEffect(() => {
    if (!filterCourseId || !user) {
      setGridStudents([]);
      setGridScores({});
      setGridComments({});
      return;
    }

    // Immediately clear stale data to avoid showing previous class data
    setGridStudents([]);
    setGridScores({});
    setGridComments({});

    const controller = new AbortController();

    const loadGridStudents = async () => {
      try {
        const course = courses.find((c) => c.id === filterCourseId);
        if (!course) return;
        const res = await fetch(
          `/api/users?schoolId=${user.schoolId}&role=STUDENT&classId=${course.classId}`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data = await res.json();
        const studentsList = Array.isArray(data.users) ? data.users : (Array.isArray(data) ? data : []);
        setGridStudents(studentsList);

        // Prepopulate gridScores and comments
        const scores: Record<string, string> = {};
        const comments: Record<string, string> = {};
        studentsList.forEach((s: UserInfo) => {
          const matching = grades.find(
            (g) => g.studentId === s.id && g.courseId === filterCourseId && g.trimester === filterTrimester
          );
          scores[s.id] = matching ? String(matching.score) : '';
          comments[s.id] = matching ? matching.comment : '';
        });
        setGridScores(scores);
        setGridComments(comments);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return; // requête annulée, pas d'erreur
      }
    };

    loadGridStudents();
    return () => controller.abort();
  }, [filterCourseId, filterTrimester, courses, grades, user]);


  const resetForm = () => {
    setFormCourseId('');
    setFormStudentId('');
    setFormScore('');
    setFormMaxScore('20');
    setFormTrimester('1');
    setFormComment('');
    setFormReason('');
    setGradeHistoryList([]);
    setEditingGrade(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = async (grade: GradeInfo) => {
    setEditingGrade(grade);
    setFormCourseId(grade.courseId);
    setFormStudentId(grade.studentId);
    setFormScore(String(grade.score));
    setFormMaxScore(String(grade.maxScore));
    setFormTrimester(grade.trimester);
    setFormComment(grade.comment);
    setFormReason('');
    
    // Fetch grade history
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/grades/${grade.id}/history`);
      if (res.ok) {
        const hData = await res.json();
        setGradeHistoryList(hData.history || []);
      }
    } catch {
    } finally {
      setLoadingHistory(false);
    }

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

    if (editingGrade && !formReason.trim()) {
      toast.error('Veuillez renseigner un motif pour la modification de la note');
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
        modifiedBy: user.id,
        reason: formReason.trim(),
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

      const studentName = students.find(s => s.id === formStudentId)?.fullName || 'Élève';
      toast.success(editingGrade ? 'Note modifiée avec succès' : 'Note ajoutée avec succès');
      setDialogOpen(false);
      resetForm();
      fetchGrades();

      // Show sync banner
      showSyncBanner(studentName, formTrimester, parseFloat(formScore) / parseFloat(formMaxScore) * 20);
    } catch {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  const lastSaved = useRef<Record<string, string>>({});

  const handleAutoSave = async (studentId: string, scoreStr: string, commentStr: string) => {
    if (!user || !filterCourseId) return;
    if (scoreStr === '') return;
    
    const key = `${studentId}-${filterCourseId}-${filterTrimester}`;
    if (lastSaved.current[key] === scoreStr) return;

    const score = parseFloat(scoreStr);
    if (isNaN(score)) return;

    try {
      const matchingGrade = grades.find((g) => g.studentId === studentId && g.courseId === filterCourseId && g.trimester === filterTrimester);
      
      const body = {
        schoolId: user.schoolId,
        courseId: filterCourseId,
        studentId,
        teacherId: user.id,
        score,
        maxScore: 20,
        trimester: filterTrimester,
        comment: commentStr.trim(),
      };

      const url = matchingGrade ? `/api/grades/${matchingGrade.id}` : '/api/grades';
      const method = matchingGrade ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        lastSaved.current[key] = scoreStr;
        const studentName = gridStudents.find(s => s.id === studentId)?.fullName || 'Élève';
        toast.success(`Note de ${studentName} enregistrée`);
        // Refresh local grades query
        const gradesRes = await fetch(`/api/grades?schoolId=${user.schoolId}&teacherId=${user.id}&courseId=${filterCourseId}&trimester=${filterTrimester}`);
        const data = await gradesRes.json();
        const freshGrades = Array.isArray(data.grades) ? data.grades : [];
        setGrades(freshGrades);

        // Compute local average for sync banner
        const studentGrades = freshGrades.filter((g: any) => g.studentId === studentId);
        const avg = studentGrades.length > 0
          ? studentGrades.reduce((s: number, g: any) => s + (g.score / g.maxScore) * 20, 0) / studentGrades.length
          : 0;
        showSyncBanner(studentName, filterTrimester, Math.round(avg * 100) / 100);
      }
    } catch {
      toast.error('Erreur lors de l\'enregistrement automatique');
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
    return grades.find((g) => g.studentId === studentId)?.student?.fullName || 'Inconnu';
  };

  const getCourseName = (courseId: string) => {
    return courses.find((c) => c.id === courseId)?.name || 'Inconnu';
  };

  const getClassAverage = () => {
    if (grades.length === 0) return '—';
    const studentMap = new Map<string, { sum: number; count: number }>();
    for (const g of grades) {
      const entry = studentMap.get(g.studentId) || { sum: 0, count: 0 };
      entry.sum += (g.score / g.maxScore) * 20;
      entry.count++;
      studentMap.set(g.studentId, entry);
    }
    const studentAverages = Array.from(studentMap.values()).map((e) => e.sum / e.count);
    const avg = studentAverages.reduce((s, a) => s + a, 0) / studentAverages.length;
    return avg.toFixed(2);
  };

  const getPassCount = () => {
    const studentMap = new Map<string, number[]>();
    for (const g of grades) {
      const list = studentMap.get(g.studentId) || [];
      list.push((g.score / g.maxScore) * 20);
      studentMap.set(g.studentId, list);
    }
    const studentAverages = Array.from(studentMap.values()).map((scores) => scores.reduce((a, b) => a + b, 0) / scores.length);
    return studentAverages.filter((avg) => avg >= 10).length;
  };

  // Real-time Class Grid stats
  const gridStats = useMemo(() => {
    const scores = Object.values(gridScores).map(s => parseFloat(s)).filter(s => !isNaN(s));
    const total = gridStudents.length;
    const graded = scores.length;
    const average = graded > 0 ? (scores.reduce((sum, s) => sum + s, 0) / graded).toFixed(2) : '—';
    return { total, graded, average };
  }, [gridScores, gridStudents]);

  if (!user) return null;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Auto-sync confirmation banner ── */}
      {syncVisible && lastSyncInfo && (
        <div className="fixed bottom-24 right-6 z-50 animate-fade-in">
          <div className="flex items-center gap-3 bg-emerald-600 text-white rounded-2xl px-5 py-3.5 shadow-2xl shadow-emerald-500/30 border border-emerald-500">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">Bulletin mis à jour automatiquement</p>
              <p className="text-xs text-emerald-100 mt-0.5">
                {lastSyncInfo.student} · T{lastSyncInfo.trimester} · Moy. {lastSyncInfo.average.toFixed(1)}/20
              </p>
            </div>
            <button
              onClick={() => setSyncVisible(false)}
              className="ml-2 text-emerald-200 hover:text-white transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}
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

      {/* Controls / Filter Bar */}
      <Card className="shadow-sm border border-border bg-card">
        <CardContent className="flex items-center gap-4 flex-wrap py-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          
          {/* iOS native style select menu for Course */}
          <select
            value={filterCourseId}
            onChange={(e) => setFilterCourseId(e.target.value)}
            className="w-48 h-10 border border-input rounded-lg px-3 bg-background text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer font-medium"
          >
            <option value="">Tous les cours</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name} — {c.class?.name}</option>
            ))}
          </select>

          {/* iOS native style select menu for Trimester */}
          <select
            value={filterTrimester}
            onChange={(e) => setFilterTrimester(e.target.value)}
            className="w-40 h-10 border border-input rounded-lg px-3 bg-background text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer font-medium"
          >
            <option value="1">Trimestre 1</option>
            <option value="2">Trimestre 2</option>
            <option value="3">Trimestre 3</option>
          </select>

          {!filterCourseId && (
            <div className="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calculator className="h-4 w-4 text-blue-500" />
                Moyenne globale: <strong className="text-foreground">{getClassAverage()}</strong>/20
              </span>
              <span>Réussites: <strong className="text-emerald-600">{getPassCount()}</strong>/{grades.length}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grid Quick Grading Mode vs List Mode */}
      {filterCourseId ? (
        <div className="space-y-6">
          {/* Grid Mode Stats & Progress bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 border-blue-150">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-blue-700/80 uppercase font-bold tracking-wider">Moyenne de classe</p>
                  <p className="text-3xl font-extrabold text-blue-600 mt-1">{gridStats.average}<span className="text-xs font-normal text-muted-foreground ml-0.5">/20</span></p>
                </div>
                <Calculator className="h-8 w-8 text-blue-500 opacity-60" />
              </div>
            </Card>
            
            <Card className="p-4 sm:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Progression de la notation</p>
                  <p className="text-base font-bold mt-0.5">{gridStats.graded} sur {gridStats.total} élèves notés</p>
                </div>
                <Sparkles className="h-5 w-5 text-amber-500" />
              </div>
              <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${gridStats.total > 0 ? (gridStats.graded / gridStats.total) * 100 : 0}%` }}
                />
              </div>
            </Card>
          </div>

          {/* Saisie rapide table */}
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/20 border-b pb-4">
              <CardTitle className="text-base flex items-center gap-2">🟢 Grille de notation rapide</CardTitle>
              <CardDescription>Saisissez les notes. La validation s'effectue automatiquement lorsque vous quittez la case (perte de focus).</CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table className="text-sm min-w-[700px]">
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="pl-6">Élève</TableHead>
                    <TableHead className="text-center w-36">Note (/20)</TableHead>
                    <TableHead className="w-80">Appréciation / Commentaire</TableHead>
                    <TableHead className="text-center w-24">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gridStudents.map((student) => {
                    const score = gridScores[student.id] || '';
                    const comment = gridComments[student.id] || '';
                    const hasGrade = score !== '';
                    
                    return (
                      <TableRow key={student.id} className="hover:bg-muted/10">
                        <TableCell className="pl-6 font-semibold">{student.fullName}</TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            inputMode="decimal"
                            step="0.25"
                            min="0"
                            max="20"
                            placeholder="—"
                            className="text-center font-bold text-sm h-10 w-24 mx-auto rounded-lg focus:ring-2 focus:ring-blue-500/20"
                            value={score}
                            onChange={(e) => setGridScores({ ...gridScores, [student.id]: e.target.value })}
                            onBlur={() => handleAutoSave(student.id, score, comment)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Ajouter une appréciation..."
                            className="h-10 rounded-lg text-xs"
                            value={comment}
                            onChange={(e) => setGridComments({ ...gridComments, [student.id]: e.target.value })}
                            onBlur={() => handleAutoSave(student.id, score, comment)}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          {hasGrade ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1"><Check className="w-3 h-3" /> Validé</Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground bg-muted/40">À saisir</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      ) : (
        /* Standard Grade List View */
        <div className="space-y-4">
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
              <p className="text-muted-foreground mb-4">Sélectionnez un cours ci-dessus pour accéder à la grille de notation rapide ou créez une note individuelle.</p>
              <Button onClick={openCreateDialog} variant="outline" className="hover:scale-[1.02] active:scale-[0.98] transition-all gap-2">
                <Plus className="h-4 w-4" />
                Ajouter une note
              </Button>
            </div>
          ) : (
            <Card className="shadow-sm">
              <ScrollArea className="max-h-[500px]">
                <div className="overflow-x-auto">
                  <Table className="min-w-[650px]">
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
                                className={`inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-sm font-bold shadow-sm ${
                                  normalizedScore >= 16 ? 'bg-green-50 text-green-700 border border-green-200' :
                                  normalizedScore >= 14 ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                  normalizedScore >= 12 ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                                  normalizedScore >= 10 ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                                  'bg-red-50 text-red-700 border border-red-200'
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
                </div>
              </ScrollArea>
            </Card>
          )}
        </div>
      )}

      {/* Create/Edit Individual Grade Dialog */}
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
              <select
                value={formCourseId}
                onChange={(e) => { setFormCourseId(e.target.value); setFormStudentId(''); }}
                className="w-full h-10 border border-input rounded-lg px-3 bg-background text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              >
                <option value="">Sélectionner un cours</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} — {c.class?.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Élève *</Label>
              <select
                value={formStudentId}
                onChange={(e) => setFormStudentId(e.target.value)}
                disabled={!formCourseId}
                className="w-full h-10 border border-input rounded-lg px-3 bg-background text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              >
                <option value="">{formCourseId ? 'Sélectionner un élève' : 'Sélectionnez d\'abord un cours'}</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.fullName}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Note *</Label>
                <Input type="number" inputMode="decimal" placeholder="0" min="0" max={formMaxScore} step="0.25" value={formScore} onChange={(e) => setFormScore(e.target.value)} className="focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
              </div>
              <div className="space-y-2">
                <Label>Note max</Label>
                <Input type="number" placeholder="20" min="1" value={formMaxScore} onChange={(e) => setFormMaxScore(e.target.value)} className="focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Trimestre *</Label>
              <select
                value={formTrimester}
                onChange={(e) => setFormTrimester(e.target.value)}
                className="w-full h-10 border border-input rounded-lg px-3 bg-background text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              >
                <option value="1">Trimestre 1</option>
                <option value="2">Trimestre 2</option>
                <option value="3">Trimestre 3</option>
              </select>
            </div>
             <div className="space-y-2">
              <Label>Commentaire</Label>
              <Textarea placeholder="Commentaire sur la performance..." value={formComment} onChange={(e) => setFormComment(e.target.value)} rows={2} className="focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs" />
            </div>

            {editingGrade && (
              <div className="space-y-2 border-t pt-3">
                <Label className="text-red-500">Motif de la modification *</Label>
                <Textarea
                  placeholder="Raison du changement de note (obligatoire)..."
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  rows={2}
                  className="focus:ring-2 focus:ring-red-500/20 focus:border-red-500 border-red-200 transition-all text-xs"
                />
              </div>
            )}

            {editingGrade && gradeHistoryList.length > 0 && (
              <div className="space-y-2 border-t pt-3">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Historique des modifications</Label>
                <div className="max-h-32 overflow-y-auto space-y-2 pr-1 text-xs">
                  {gradeHistoryList.map((h: any) => (
                    <div key={h.id} className="p-2 rounded bg-muted/50 border text-[11px] leading-relaxed">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Par: {h.modifier?.fullName || 'Enseignant'} ({h.modifier?.role})</span>
                        <span>{new Date(h.createdAt).toLocaleString('fr-FR')}</span>
                      </div>
                      <div className="mt-1">
                        Valeur : <strong className="text-red-600">{h.oldScore}</strong> → <strong className="text-emerald-600">{h.newScore}</strong>
                      </div>
                      {h.reason && (
                        <div className="mt-0.5 text-muted-foreground italic">
                          Motif : "{h.reason}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
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
