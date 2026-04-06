'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart3,
  FileText,
  GraduationCap,
  Users,
  DollarSign,
  TrendingUp,
  Loader2,
  BookOpen,
  Printer,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';

interface ClassItem {
  id: string;
  name: string;
  level: string;
}

interface GradeItem {
  id: string;
  studentId: string;
  courseId: string;
  score: number;
  maxScore: number;
  trimester: string;
  comment: string;
  course?: { id: string; name: string };
  student?: { id: string; fullName: string };
  teacher?: { id: string; fullName: string };
}

interface AttendanceItem {
  id: string;
  studentId: string;
  date: string;
  status: string;
  student?: { id: string; fullName: string };
}

interface PaymentItem {
  id: string;
  amount: number;
  status: string;
  studentId: string;
  student?: { id: string; fullName: string };
}

export default function AdminReports() {
  const { user } = useAppStore();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTrimester, setSelectedTrimester] = useState('1');
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [reportGrades, setReportGrades] = useState<GradeItem[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);

  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch(`/api/classes?schoolId=${user?.schoolId}`);
      const data = await res.json();
      setClasses(data.classes || []);
    } catch {
      console.error('Failed to fetch classes');
    }
  }, [user?.schoolId]);

  const fetchReportData = useCallback(async () => {
    try {
      const [gradesRes, attendanceRes, paymentsRes] = await Promise.all([
        fetch(`/api/grades?schoolId=${user?.schoolId}`),
        fetch(`/api/attendance?schoolId=${user?.schoolId}`),
        fetch(`/api/payments?schoolId=${user?.schoolId}`),
      ]);
      const gradesData = await gradesRes.json();
      const attendanceData = await attendanceRes.json();
      const paymentsData = await paymentsRes.json();
      setGrades(gradesData.grades || []);
      setAttendance(attendanceData.attendance || []);
      setPayments(paymentsData.payments || []);
    } catch {
      console.error('Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  }, [user?.schoolId]);

  useEffect(() => {
    if (user?.schoolId) {
      setLoading(true);
      fetchClasses();
      fetchReportData();
    }
  }, [fetchClasses, fetchReportData, user?.schoolId]);

  const generateReport = async () => {
    if (!selectedClass) {
      toast.error('Veuillez sélectionner une classe');
      return;
    }

    setGeneratingReport(true);
    try {
      const usersRes = await fetch(`/api/users?schoolId=${user?.schoolId}&role=STUDENT&classId=${selectedClass}`);
      const usersData = await usersRes.json();
      const students = usersData.users || [];

      const gradesRes = await fetch(`/api/grades?schoolId=${user?.schoolId}&trimester=${selectedTrimester}`);
      const gradesData = await gradesRes.json();

      const studentIds = new Set(students.map((s: { id: string }) => s.id));
      const classGrades = (gradesData.grades || []).filter(
        (g: GradeItem) => studentIds.has(g.studentId)
      );
      setReportGrades(classGrades);
      setShowReport(true);
      toast.success('Bulletin généré avec succès');
    } catch {
      toast.error('Erreur lors de la génération du bulletin');
    } finally {
      setGeneratingReport(false);
    }
  };

  const gradesByCourse = grades.reduce<Record<string, { name: string; scores: number[] }>>((acc, g) => {
    const courseName = g.course?.name || 'Inconnu';
    if (!acc[g.courseId]) {
      acc[g.courseId] = { name: courseName, scores: [] };
    }
    acc[g.courseId].scores.push(g.maxScore > 0 ? (g.score / g.maxScore) * 20 : g.score);
    return acc;
  }, {});

  const courseAverages = Object.values(gradesByCourse).map((c) => ({
    name: c.name,
    average: c.scores.length > 0 ? c.scores.reduce((a, b) => a + b, 0) / c.scores.length : 0,
  }));

  const attendanceStats = {
    present: attendance.filter((a) => a.status === 'present').length,
    absent: attendance.filter((a) => a.status === 'absent').length,
    late: attendance.filter((a) => a.status === 'late').length,
    total: attendance.length,
    rate: attendance.length > 0
      ? Math.round((attendance.filter((a) => a.status === 'present').length / attendance.length) * 100)
      : 0,
  };

  const paymentStats = {
    paid: payments.filter((p) => p.status === 'paid').length,
    pending: payments.filter((p) => p.status === 'pending').length,
    overdue: payments.filter((p) => p.status === 'overdue').length,
    totalPaid: payments
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0),
    totalPending: payments
      .filter((p) => p.status !== 'paid')
      .reduce((sum, p) => sum + p.amount, 0),
  };

  const reportByStudent = reportGrades.reduce<Record<string, {
    studentName: string;
    grades: GradeItem[];
    average: number;
  }>>((acc, g) => {
    const sid = g.studentId;
    if (!acc[sid]) {
      acc[sid] = { studentName: g.student?.fullName || 'Inconnu', grades: [], average: 0 };
    }
    acc[sid].grades.push(g);
    return acc;
  }, {});

  Object.values(reportByStudent).forEach((student) => {
    const scores = student.grades.map((g) => (g.maxScore > 0 ? (g.score / g.maxScore) * 20 : g.score));
    student.average = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  });

  const maxBarValue = Math.max(...courseAverages.map((c) => c.average), 20);

  const exportCSV = () => {
    if (Object.keys(reportByStudent).length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }
    const BOM = '\uFEFF';
    const headers = ['Élève', 'Matière', 'Note', 'Note Max', 'Moyenne / 20', 'Appréciation'];
    const rows: string[][] = [];
    Object.entries(reportByStudent).forEach(([, student]) => {
      student.grades.forEach((g) => {
        const normalized = g.maxScore > 0 ? ((g.score / g.maxScore) * 20) : g.score;
        rows.push([
          student.studentName,
          g.course?.name || 'Inconnu',
          g.score.toString(),
          g.maxScore.toString(),
          normalized.toFixed(2),
          g.comment || '',
        ]);
      });
      rows.push([student.studentName, '', '', '', student.average.toFixed(2), 'MOYENNE']);
      rows.push([]);
    });
    const csv = BOM + [headers, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bulletin_${classes.find((c) => c.id === selectedClass)?.name || 'classe'}_T${selectedTrimester}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Fichier CSV exporté avec succès');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="mb-6 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Rapports & Statistiques</h1>
            <p className="text-sm text-muted-foreground mt-1">Analysez les performances de votre école</p>
          </div>
          {showReport && (
            <div className="flex gap-2">
              <Button onClick={exportCSV} variant="outline" className="hover:scale-[1.02] active:scale-[0.98] transition-all gap-2">
                <Download className="h-4 w-4" />
                Exporter CSV
              </Button>
              <Button variant="outline" className="hover:scale-[1.02] active:scale-[0.98] transition-all gap-2">
                <Printer className="h-4 w-4" />
                Imprimer
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Report Generation */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Génération de bulletins
          </CardTitle>
          <CardDescription>
            Générez un bulletin de notes pour une classe et un trimestre spécifiques
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-2 flex-1">
              <Label>Classe</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
                  <SelectValue placeholder="Sélectionner une classe" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 w-[180px]">
              <Label>Trimestre</Label>
              <Select value={selectedTrimester} onValueChange={setSelectedTrimester}>
                <SelectTrigger className="focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1er Trimestre</SelectItem>
                  <SelectItem value="2">2ème Trimestre</SelectItem>
                  <SelectItem value="3">3ème Trimestre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={generateReport}
              disabled={generatingReport || !selectedClass}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg shadow-blue-500/20"
            >
              {generatingReport ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Générer
                </>
              )}
            </Button>
          </div>

          {/* Report Card Preview */}
          {showReport && (
            <div className="mt-6 space-y-4">
              <Separator />
              <div className="bg-gradient-to-b from-white to-blue-50/30 border-2 border-blue-100 rounded-xl p-6">
                <div className="text-center mb-6">
                  <div className="mx-auto w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center mb-3">
                    <GraduationCap className="w-7 h-7 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold">{classes.find((c) => c.id === selectedClass)?.name || ''}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Bulletin — {selectedTrimester === '1' ? '1er' : selectedTrimester === '2' ? '2ème' : '3ème'} Trimestre
                  </p>
                </div>

                {Object.keys(reportByStudent).length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                      <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-muted-foreground">Aucune note disponible pour cette classe et ce trimestre</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[400px]">
                    <div className="space-y-6">
                      {Object.entries(reportByStudent).map(([studentId, student]) => (
                        <div key={studentId} className="border rounded-lg p-4 even:bg-muted/10">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold">{student.studentName}</h4>
                            <Badge
                              className={
                                student.average >= 10
                                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                  : 'bg-red-100 text-red-700 border-red-200'
                              }
                            >
                              Moyenne : {student.average.toFixed(2)} / 20
                            </Badge>
                          </div>
                          <Table className="text-sm">
                            <TableHeader>
                              <TableRow className="bg-muted/30 hover:bg-muted/30">
                                <TableHead>Matière</TableHead>
                                <TableHead className="text-center">Note</TableHead>
                                <TableHead className="text-center">Max</TableHead>
                                <TableHead>Appréciation</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody className="[&>tr:nth-child(even)]:bg-muted/30">
                              {student.grades.map((g) => {
                                const normalized = g.maxScore > 0 ? ((g.score / g.maxScore) * 20) : g.score;
                                return (
                                  <TableRow key={g.id} className="hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors">
                                    <TableCell className="font-medium">
                                      {g.course?.name || 'Inconnu'}
                                    </TableCell>
                                    <TableCell className="text-center font-bold">
                                      <span className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-sm ${
                                        normalized >= 10 ? 'bg-emerald-100 text-emerald-700' :
                                        normalized >= 7 ? 'bg-amber-100 text-amber-700' :
                                        'bg-red-100 text-red-700'
                                      }`}>
                                        {normalized.toFixed(1)}
                                      </span>
                                    </TableCell>
                                    <TableCell className="text-center text-muted-foreground">20</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                      {g.comment || '—'}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics Section */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      ) : (
        <>
          {/* Grade Averages by Course */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Moyennes par matière
              </CardTitle>
              <CardDescription>
                Performance moyenne des élèves par cours (sur 20)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {courseAverages.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                    <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground">Aucune donnée de notes disponible</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {courseAverages
                    .sort((a, b) => b.average - a.average)
                    .map((course) => {
                      const percentage = (course.average / 20) * 100;
                      const barColor =
                        course.average >= 14
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                          : course.average >= 10
                            ? 'bg-gradient-to-r from-blue-500 to-blue-400'
                            : course.average >= 8
                              ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                              : 'bg-gradient-to-r from-red-500 to-red-400';
                      const textColor =
                        course.average >= 14 ? 'text-emerald-600' :
                        course.average >= 10 ? 'text-blue-600' :
                        course.average >= 8 ? 'text-amber-600' : 'text-red-600';
                      return (
                        <div key={course.name} className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium truncate max-w-[200px]">
                              {course.name}
                            </span>
                            <span className={`font-bold ${textColor}`}>{course.average.toFixed(1)} / 20</span>
                          </div>
                          <div className="h-3 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attendance & Payment Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Attendance Statistics */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Statistiques de présence
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {attendanceStats.total === 0 ? (
                  <div className="text-center py-8">
                    <div className="mx-auto w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-2">
                      <Users className="h-7 w-7 text-muted-foreground/50" />
                    </div>
                    <p className="text-muted-foreground">Aucune donnée de présence</p>
                  </div>
                ) : (
                  <>
                    <div className="text-center mb-2">
                      <p className="text-4xl font-bold text-blue-600">{attendanceStats.rate}%</p>
                      <p className="text-sm text-muted-foreground">Taux de présence</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-emerald-500" />
                          Présent
                        </span>
                        <span className="font-semibold">{attendanceStats.present}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-red-500" />
                          Absent
                        </span>
                        <span className="font-semibold">{attendanceStats.absent}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-amber-500" />
                          En retard
                        </span>
                        <span className="font-semibold">{attendanceStats.late}</span>
                      </div>
                    </div>
                    <div className="flex h-4 rounded-full overflow-hidden bg-muted">
                      {attendanceStats.total > 0 && (
                        <>
                          <div
                            className="bg-emerald-500 transition-all"
                            style={{ width: `${(attendanceStats.present / attendanceStats.total) * 100}%` }}
                          />
                          <div
                            className="bg-amber-500 transition-all"
                            style={{ width: `${(attendanceStats.late / attendanceStats.total) * 100}%` }}
                          />
                          <div
                            className="bg-red-500 transition-all"
                            style={{ width: `${(attendanceStats.absent / attendanceStats.total) * 100}%` }}
                          />
                        </>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Payment Statistics */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                  Statistiques de paiements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {payments.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="mx-auto w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-2">
                      <DollarSign className="h-7 w-7 text-muted-foreground/50" />
                    </div>
                    <p className="text-muted-foreground">Aucune donnée de paiement</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                        <p className="text-2xl font-bold text-emerald-600">
                          {paymentStats.totalPaid.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">USD encaissés</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-amber-50 border border-amber-100">
                        <p className="text-2xl font-bold text-amber-600">
                          {paymentStats.totalPending.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">USD en attente</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-emerald-500" />
                          Payés
                        </span>
                        <span className="font-semibold">{paymentStats.paid}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-amber-500" />
                          En attente
                        </span>
                        <span className="font-semibold">{paymentStats.pending}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-red-500" />
                          En retard
                        </span>
                        <span className="font-semibold">{paymentStats.overdue}</span>
                      </div>
                    </div>
                    <div className="flex h-4 rounded-full overflow-hidden bg-muted">
                      {payments.length > 0 && (
                        <>
                          <div
                            className="bg-emerald-500 transition-all"
                            style={{ width: `${(paymentStats.paid / payments.length) * 100}%` }}
                          />
                          <div
                            className="bg-amber-500 transition-all"
                            style={{ width: `${(paymentStats.pending / payments.length) * 100}%` }}
                          />
                          <div
                            className="bg-red-500 transition-all"
                            style={{ width: `${(paymentStats.overdue / payments.length) * 100}%` }}
                          />
                        </>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
