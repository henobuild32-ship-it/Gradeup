'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  FileText,
  CheckCircle2,
  Clock,
  Send,
  Eye,
  Plus,
  RefreshCw,
  GraduationCap,
  Users,
  BookOpen,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ReportCardItem {
  id: string;
  reportNumber: string;
  studentId: string;
  trimester: string;
  academicYear: string;
  studentName: string;
  overallPercentage: number;
  averageGrade: number;
  mention: string;
  status: string;
  createdAt: string;
  student: { id: string; fullName: string; photoUrl: string };
  class: { id: string; name: string; level: string };
  gradesData: Record<string, unknown>;
}

interface ClassInfo {
  id: string;
  name: string;
  level: string;
  _count: { enrollments: number };
}

export default function TeacherReports() {
  const { schoolId, user } = useAppStore();
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [students, setStudents] = useState<{ id: string; fullName: string }[]>([]);
  const [reportCards, setReportCards] = useState<ReportCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<string>('all');
  const [createDialog, setCreateDialog] = useState<{ studentId: string; studentName: string } | null>(null);
  const [viewReport, setViewReport] = useState<ReportCardItem | null>(null);
  const [formGrades, setFormGrades] = useState('');
  const [formAppreciation, setFormAppreciation] = useState('');

  const fetchData = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const [classesRes, studentsRes, reportsRes] = await Promise.all([
        fetch(`/api/classes?schoolId=${schoolId}`),
        fetch(`/api/users?schoolId=${schoolId}&role=STUDENT&teacherId=${user.id}`),
        fetch(`/api/report-cards?schoolId=${schoolId}&teacherId=${user.id}`),
      ]);
      const classesData = await classesRes.json();
      const studentsData = await studentsRes.json();
      const reportsData = await reportsRes.json();
      setClasses(classesData.classes || []);
      setStudents(studentsData.users || []);
      setReportCards(reportsData.reportCards || []);
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de charger les données', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [schoolId, user.id, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateReport = async () => {
    if (!createDialog) return;
    try {
      const student = students.find((s) => s.id === createDialog.studentId);
      const reportNumber = `RPT-${Date.now()}`;
      const parsedGrades = (formGrades || '{}').split(',').reduce((acc, item) => {
        const [key, val] = item.split(':');
        if (key && val) acc[key.trim()] = parseFloat(val.trim());
        return acc;
      }, {} as Record<string, number>);

      const res = await fetch('/api/report-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportNumber,
          schoolId,
          classId: selectedClass !== 'all' ? selectedClass : undefined,
          studentId: createDialog.studentId,
          teacherId: user.id,
          trimester: '3',
          studentName: createDialog.studentName,
          studentGender: student?.gender || 'M',
          studentBirthDate: student?.birthDate || '',
          totalPointsObtained: 0,
          totalPointsPossible: 0,
          overallPercentage: 0,
          averageGrade: 0,
          classRank: 0,
          mention: 'À déterminer',
          gradesData: { grades: parsedGrades, appreciation: formAppreciation },
        }),
      });
      if (!res.ok) throw new Error();
      toast({ title: 'Succès', description: 'Bulletin créé' });
      setCreateDialog(null);
      setFormGrades('');
      fetchData();
    } catch {
      toast({ title: 'Erreur', description: 'Échec de création', variant: 'destructive' });
    }
  };

  const handleTransmit = async (report: ReportCardItem) => {
    try {
      const res = await fetch('/api/report-cards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: report.id, status: 'pending_admin', teacherId: user.id }),
      });
      if (!res.ok) throw new Error();
      toast.success('Bulletin transmis à l\'administration');
      fetchData();
    } catch {
      toast({ title: 'Erreur', description: 'Échec de transmission', variant: 'destructive' });
    }
  };

  const filteredStudents = selectedClass !== 'all'
    ? students.filter((s) => s.id.includes('')) // filter would need class enrollment lookup
    : students;
  const filteredReports = reportCards.filter((r) => {
    if (selectedClass !== 'all' && r.class.id !== selectedClass) return false;
    if (selectedStudent !== 'all' && r.studentId !== selectedStudent) return false;
    return true;
  });

  const draftCount = reportCards.filter((r) => r.status === 'draft').length;
  const pendingCount = reportCards.filter((r) => r.status === 'pending_admin').length;
  const validatedCount = reportCards.filter((r) => r.status === 'validated').length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rapports - Bulletins scolaires</h1>
          <p className="text-muted-foreground">Créez, consultez et transmettez les bulletins de vos élèves</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Brouillons</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-yellow-600">{draftCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente (admin)</CardTitle>
            <Send className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-600">{pendingCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Validés</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{validatedCount}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle>Liste des bulletins</CardTitle>
            <div className="flex flex-wrap gap-2">
              <select
                className="border rounded-md px-3 py-1.5 text-sm"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <option value="all">Toutes les classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Aucun bulletin pour le moment</div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {filteredReports.map((report) => (
                  <Card key={report.id} className="border-l-4 border-l-transparent hover:border-l-primary transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{report.studentName}</span>
                            <Badge variant={
                              report.status === 'validated' ? 'default' :
                              report.status === 'pending_admin' ? 'secondary' : 'outline'
                            }>
                              {report.status === 'draft' ? 'Brouillon' :
                               report.status === 'pending_admin' ? 'En attente' : 'Validé'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {report.class.name} · T{report.trimester} · {report.averageGrade.toFixed(1)}/20
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setViewReport(report)}>
                            <Eye className="w-4 h-4 mr-1" /> Voir
                          </Button>
                          {report.status === 'draft' && (
                            <Button variant="ghost" size="sm" className="text-blue-600" onClick={() => handleTransmit(report)}>
                              <Send className="w-4 h-4 mr-1" /> Transmettre
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Créer un bulletin</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <select
              className="border rounded-md px-3 py-2 text-sm"
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
            >
              <option value="all">Sélectionner un élève</option>
              {filteredStudents.map((s) => (
                <option key={s.id} value={s.id}>{s.fullName}</option>
              ))}
            </select>
            <Button
              disabled={selectedStudent === 'all' || reportCards.some((r) => r.studentId === selectedStudent)}
              onClick={() => {
                const s = students.find((st) => st.id === selectedStudent);
                if (s) setCreateDialog({ studentId: s.id, studentName: s.fullName });
              }}
            >
              <Plus className="w-4 h-4 mr-2" /> Créer le bulletin
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!createDialog} onOpenChange={() => setCreateDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau bulletin - {createDialog?.studentName}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Notes (format: matière:note, matière:note)</Label>
              <Input value={formGrades} onChange={(e) => setFormGrades(e.target.value)} placeholder="Math:14, Français:12, Anglais:16" />
            </div>
            <div>
              <Label>Appréciations</Label>
              <Textarea value={formAppreciation} onChange={(e) => setFormAppreciation(e.target.value)} placeholder="Appréciations générales..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(null)}>Annuler</Button>
            <Button onClick={handleCreateReport}>Créer le bulletin</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewReport} onOpenChange={() => setViewReport(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Bulletin - {viewReport?.studentName}</DialogTitle></DialogHeader>
          {viewReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-muted-foreground">Classe</p><p className="font-medium">{viewReport.class.name}</p></div>
                <div><p className="text-sm text-muted-foreground">Moyenne</p><p className="font-medium">{viewReport.averageGrade.toFixed(1)}/20</p></div>
                <div><p className="text-sm text-muted-foreground">Pourcentage</p><p className="font-medium">{viewReport.overallPercentage.toFixed(1)}%</p></div>
                <div><p className="text-sm text-muted-foreground">Mention</p><p className="font-medium">{viewReport.mention}</p></div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Appréciations</p>
                <p className="text-sm">{(viewReport.gradesData as any)?.appreciation || 'Aucune appréciation'}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}