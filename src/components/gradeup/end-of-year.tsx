'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  GraduationCap,
  ArrowUpCircle,
  RotateCcw,
  Award,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Lock,
  ChevronRight,
  Eye,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ClassAnalysis {
  classId: string;
  className: string;
  totalStudents: number;
  passages: number;
  redoublements: number;
  finsCursus: number;
  enAttente: number;
}

interface StudentAnalysis {
  studentId: string;
  fullName: string;
  matricule: string;
  overallAverage: number;
  subjectResults: { name: string; average: number; maxScore: number }[];
  totalAbsences: number;
  justifiedAbsences: number;
  unjustifiedAbsences: number;
  autoDecision: string;
  hasReportCard: boolean;
}

export default function EndOfYear() {
  const { schoolId, user } = useAppStore();
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassAnalysis[]>([]);
  const [students, setStudents] = useState<StudentAnalysis[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentLoading, setStudentLoading] = useState(false);
  const [lockDialog, setLockDialog] = useState(false);
  const [generateDialog, setGenerateDialog] = useState(false);
  const [newYear, setNewYear] = useState('2026-2027');
  const [decisions, setDecisions] = useState<Record<string, string>>({});

  const isTeacher = user?.role === 'TEACHER';

  const fetchClasses = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ schoolId });
      if (isTeacher) params.set('teacherId', user.id);
      const res = await fetch(`/api/end-of-year?${params}`);
      const data = await res.json();
      setClasses(data.classes || []);
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de charger les classes', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [schoolId, user.id, isTeacher, toast]);

  const fetchStudents = useCallback(async (classId: string) => {
    setStudentLoading(true);
    setSelectedClass(classId);
    try {
      const params = new URLSearchParams({ schoolId, classId });
      if (isTeacher) params.set('teacherId', user.id);
      const res = await fetch(`/api/end-of-year?${params}`);
      const data = await res.json();
      setStudents(data.students || []);
      const auto: Record<string, string> = {};
      (data.students || []).forEach((s: StudentAnalysis) => { auto[s.studentId] = s.autoDecision; });
      setDecisions(auto);
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de charger les élèves', variant: 'destructive' });
    } finally {
      setStudentLoading(false);
    }
  }, [schoolId, isTeacher, user.id, toast]);

  useEffect(() => { fetchClasses(); }, [fetchClasses]);

  const handleLockYear = async () => {
    if (!schoolId) return;
    try {
      const res = await fetch('/api/end-of-year', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lock-year', schoolId, adminId: user.id }),
      });
      if (!res.ok) throw new Error();
      toast.success('Année scolaire verrouillée');
      setLockDialog(false);
    } catch {
      toast({ title: 'Erreur', description: 'Échec du verrouillage', variant: 'destructive' });
    }
  };

  const handleGenerateClasses = async () => {
    if (!schoolId || !selectedClass) return;
    try {
      const decisionsArr = students.map((s) => ({
        studentId: s.studentId,
        status: decisions[s.studentId] || s.autoDecision,
      }));
      const res = await fetch('/api/end-of-year', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-classes',
          schoolId,
          adminId: user.id,
          classId: selectedClass,
          decisions: decisionsArr,
          newAcademicYear: newYear,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Classes générées pour la nouvelle année');
      setGenerateDialog(false);
      fetchClasses();
    } catch {
      toast({ title: 'Erreur', description: 'Échec de génération', variant: 'destructive' });
    }
  };

  const totalAll = classes.reduce((s, c) => s + c.totalStudents, 0);
  const passagesAll = classes.reduce((s, c) => s + c.passages, 0);
  const redoublementsAll = classes.reduce((s, c) => s + c.redoublements, 0);
  const enAttenteAll = classes.reduce((s, c) => s + c.enAttente, 0);

  const getDecisionBadge = (d: string) => {
    switch (d) {
      case 'passage': return <Badge className="bg-green-100 text-green-700"><ArrowUpCircle className="w-3 h-3 mr-1" />Passage</Badge>;
      case 'redoublement': return <Badge variant="destructive"><RotateCcw className="w-3 h-3 mr-1" />Redoublement</Badge>;
      case 'fin_cursus': return <Badge className="bg-blue-100 text-blue-700"><Award className="w-3 h-3 mr-1" />Fin de cursus</Badge>;
      default: return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Délibération</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fin du cursus scolaire</h1>
          <p className="text-muted-foreground">Analyse de fin d'année, passage et redoublement</p>
        </div>
        <div className="flex gap-2">
          {!isTeacher && (
            <>
              <Button variant="outline" onClick={() => setLockDialog(true)}>
                <Lock className="w-4 h-4 mr-2" /> Verrouiller l'année
              </Button>
              {selectedClass && (
                <Button onClick={() => setGenerateDialog(true)}>
                  <GraduationCap className="w-4 h-4 mr-2" /> Générer classes N+1
                </Button>
              )}
            </>
          )}
          <Button variant="outline" size="sm" onClick={fetchClasses} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total élèves</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{totalAll}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-green-600">Passages</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{passagesAll}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-red-600">Redoublements</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{redoublementsAll}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-blue-600">Fin de cursus</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-blue-600">{classes.reduce((s, c) => s + c.finsCursus, 0)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-yellow-600">En attente</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-yellow-600">{enAttenteAll}</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Classes</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {classes.map((cls) => (
                    <button
                      key={cls.classId}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedClass === cls.classId ? 'border-primary bg-primary/5' : 'hover:bg-accent'}`}
                      onClick={() => fetchStudents(cls.classId)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{cls.className}</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{cls.totalStudents} élèves</span>
                        <span className="text-green-600">{cls.passages} ✅</span>
                        <span className="text-red-600">{cls.redoublements} 🔄</span>
                        {cls.finsCursus > 0 && <span className="text-blue-600">{cls.finsCursus} 🎓</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>{selectedClass ? `Élèves de la classe sélectionnée` : 'Sélectionnez une classe'}</CardTitle></CardHeader>
          <CardContent>
            {!selectedClass ? (
              <div className="text-center py-12 text-muted-foreground">Cliquez sur une classe pour voir les élèves</div>
            ) : studentLoading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : students.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">Aucun élève trouvé</div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {students.map((s) => (
                    <Card key={s.studentId} className="border-l-4 border-l-transparent hover:border-l-primary">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{s.fullName}</span>
                              {getDecisionBadge(decisions[s.studentId] || s.autoDecision)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Moyenne: {s.overallAverage.toFixed(1)}/20 · Absences: {s.totalAbsences} ({s.justifiedAbsences} justifiées)
                            </p>
                          </div>
                          {!isTeacher && (
                            <select
                              className="border rounded px-2 py-1 text-sm"
                              value={decisions[s.studentId] || s.autoDecision}
                              onChange={(e) => setDecisions({ ...decisions, [s.studentId]: e.target.value })}
                            >
                              <option value="passage">Passage</option>
                              <option value="redoublement">Redoublement</option>
                              <option value="deliberation">Délibération</option>
                            </select>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={lockDialog} onOpenChange={setLockDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Verrouiller l'année scolaire</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Cette action verrouille l'année en cours. Après cela, aucun changement ne sera possible. Confirmez-vous ?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLockDialog(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleLockYear}>Verrouiller</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={generateDialog} onOpenChange={setGenerateDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Générer les classes N+1</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Les décisions seront appliquées : passage → promotion, redoublement → maintien.</p>
            <div>
              <Label>Nouvelle année scolaire</Label>
              <Input value={newYear} onChange={(e) => setNewYear(e.target.value)} />
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {students.map((s) => (
                <div key={s.studentId} className="flex justify-between text-sm py-1 border-b">
                  <span>{s.fullName}</span>
                  <Badge variant="outline">{decisions[s.studentId] || s.autoDecision}</Badge>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDialog(false)}>Annuler</Button>
            <Button onClick={handleGenerateClasses}>Générer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}