'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, XCircle, Clock, Save, Users, Calendar, History, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { UserInfo, AttendanceInfo, CourseInfo, AttendanceStatus } from '@/lib/types';

interface StudentAttendance {
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
  reason: string;
  existingId?: string;
}

export default function TeacherAttendance() {
  const { user } = useAppStore();
  const [courses, setCourses] = useState<CourseInfo[]>([]);
  const [students, setStudents] = useState<UserInfo[]>([]);
  const [attendance, setAttendance] = useState<StudentAttendance[]>([]);
  const [history, setHistory] = useState<AttendanceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => { if (!user) return; fetchCourses(); }, [user]);

  const fetchCourses = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/courses?schoolId=${user.schoolId}&teacherId=${user.id}`);
      const data = await res.json();
      setCourses(data || []);
    } catch { /* silent */ }
  };

  useEffect(() => { if (!user || !selectedCourseId) return; fetchStudentsAndAttendance(); }, [user, selectedCourseId, selectedDate]);

  const fetchStudentsAndAttendance = async () => {
    if (!user || !selectedCourseId) return;
    setLoading(true);
    try {
      const course = courses.find((c) => c.id === selectedCourseId);
      if (!course) return;
      const studentsRes = await fetch(`/api/users?schoolId=${user.schoolId}&role=STUDENT&classId=${course.classId}`);
      const studentsData = await studentsRes.json();
      const attendanceRes = await fetch(`/api/attendance?schoolId=${user.schoolId}&date=${selectedDate}`);
      const attendanceData = await attendanceRes.json();
      const mergedAttendance: StudentAttendance[] = (studentsData || []).map((student: UserInfo) => {
        const existing = (attendanceData || []).find((a: AttendanceInfo) => a.studentId === student.id);
        return { studentId: student.id, studentName: student.fullName, status: existing?.status || 'present', reason: existing?.reason || '', existingId: existing?.id };
      });
      setStudents(studentsData || []);
      setAttendance(mergedAttendance);
    } catch { toast.error('Erreur lors du chargement'); } finally { setLoading(false); }
  };

  const updateStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendance((prev) => prev.map((a) => a.studentId === studentId ? { ...a, status } : a));
  };

  const updateReason = (studentId: string, reason: string) => {
    setAttendance((prev) => prev.map((a) => a.studentId === studentId ? { ...a, reason } : a));
  };

  const handleSave = async () => {
    if (!user || !selectedCourseId) return;
    setSaving(true);
    try {
      for (const record of attendance) {
        const body = { schoolId: user.schoolId, studentId: record.studentId, teacherId: user.id, date: selectedDate, status: record.status, reason: record.reason };
        if (record.existingId) {
          await fetch(`/api/attendance/${record.existingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        } else {
          await fetch('/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        }
      }
      toast.success('Appel enregistré avec succès');
      fetchStudentsAndAttendance();
    } catch { toast.error("Erreur lors de l'enregistrement"); } finally { setSaving(false); }
  };

  const markAllPresent = () => {
    setAttendance((prev) => prev.map((a) => ({ ...a, status: 'present', reason: '' })));
  };

  const fetchHistory = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/attendance?schoolId=${user.schoolId}`);
      const data = await res.json();
      setHistory((data || []).filter((a: AttendanceInfo) => a.teacherId === user.id).sort((a: AttendanceInfo, b: AttendanceInfo) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 50));
    } catch { /* silent */ }
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case 'present': return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Présent</Badge>;
      case 'absent': return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs"><XCircle className="h-3 w-3 mr-1" />Absent</Badge>;
      case 'late': return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs"><Clock className="h-3 w-3 mr-1" />En retard</Badge>;
    }
  };

  const getStats = () => {
    const present = attendance.filter((a) => a.status === 'present').length;
    const absent = attendance.filter((a) => a.status === 'absent').length;
    const late = attendance.filter((a) => a.status === 'late').length;
    return { present, absent, late, total: attendance.length };
  };

  const stats = getStats();

  // Calendar heatmap data
  const getDaysInMonth = () => {
    const year = parseInt(selectedDate.split('-')[0]);
    const month = parseInt(selectedDate.split('-')[1]) - 1;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth, year, month };
  };

  if (!user) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="mb-6 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-6">
        <h1 className="text-2xl font-bold">Appel</h1>
        <p className="text-sm text-muted-foreground mt-1">Enregistrez la présence de vos élèves</p>
      </div>

      <Tabs defaultValue="register">
        <TabsList>
          <TabsTrigger value="register" className="gap-1.5"><Users className="h-4 w-4" />Appel du jour</TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5" onClick={fetchHistory}><History className="h-4 w-4" />Historique</TabsTrigger>
        </TabsList>

        <TabsContent value="register">
          {/* Controls */}
          <Card className="mb-6 shadow-sm">
            <CardContent className="flex items-center gap-4 flex-wrap py-4">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-44 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger className="w-56 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
                  <SelectValue placeholder="Sélectionner une classe" />
                </SelectTrigger>
                <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} — {c.class?.name}</SelectItem>)}</SelectContent>
              </Select>
              {selectedCourseId && attendance.length > 0 && (
                <>
                  <Button variant="outline" size="sm" onClick={markAllPresent} className="hover:scale-[1.02] active:scale-[0.98] transition-all gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                    <CheckCircle2 className="h-4 w-4" />Tous présents
                  </Button>
                  <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 ml-auto hover:scale-[1.02] active:scale-[0.98] transition-all" onClick={handleSave} disabled={saving}>
                    <Save className="h-4 w-4 mr-1" />{saving ? 'Enregistrement...' : 'Enregistrer'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Stats Row */}
          {selectedCourseId && attendance.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="p-4 rounded-xl bg-blue-50 text-center border border-blue-100">
                <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                <p className="text-xs text-blue-600/80 font-medium">Total</p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50 text-center border border-emerald-100">
                <p className="text-2xl font-bold text-emerald-600">{stats.present}</p>
                <p className="text-xs text-emerald-600/80 font-medium">Présents</p>
              </div>
              <div className="p-4 rounded-xl bg-red-50 text-center border border-red-100">
                <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
                <p className="text-xs text-red-600/80 font-medium">Absents</p>
              </div>
              <div className="p-4 rounded-xl bg-amber-50 text-center border border-amber-100">
                <p className="text-2xl font-bold text-amber-600">{stats.late}</p>
                <p className="text-xs text-amber-600/80 font-medium">En retard</p>
              </div>
            </div>
          )}

          {/* Student List */}
          {!selectedCourseId ? (
            <Card className="shadow-sm"><CardContent className="flex flex-col items-center justify-center py-16">
              <div className="mx-auto w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4"><Users className="h-10 w-10 text-muted-foreground/50" /></div>
              <p className="text-muted-foreground">Sélectionnez une classe pour commencer l&apos;appel</p>
            </CardContent></Card>
          ) : loading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-md" />)}</div>
          ) : attendance.length === 0 ? (
            <Card className="shadow-sm"><CardContent className="flex flex-col items-center justify-center py-16">
              <div className="mx-auto w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4"><UserCheck className="h-10 w-10 text-muted-foreground/50" /></div>
              <p className="text-muted-foreground">Aucun élève dans cette classe</p>
            </CardContent></Card>
          ) : (
            <Card className="shadow-sm">
              <ScrollArea className="max-h-[500px]">
                <div className="divide-y">
                  {attendance.map((record) => (
                    <div key={record.studentId} className={`flex items-center gap-4 p-4 transition-colors ${record.status === 'absent' ? 'bg-red-50/50' : record.status === 'late' ? 'bg-amber-50/50' : 'hover:bg-muted/30'}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${record.status === 'present' ? 'bg-emerald-500' : record.status === 'absent' ? 'bg-red-500' : 'bg-amber-500'}`}>
                            {record.studentName.charAt(0)}
                          </div>
                          <p className="font-medium text-sm">{record.studentName}</p>
                        </div>
                        {record.status !== 'present' && (
                          <Input placeholder="Raison..." className="mt-2 h-8 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" value={record.reason} onChange={(e) => updateReason(record.studentId, e.target.value)} />
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button type="button" size="lg" variant={record.status === 'present' ? 'default' : 'outline'} className={`px-5 py-5 transition-all hover:scale-[1.05] active:scale-[0.95] ${record.status === 'present' ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/25' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`} onClick={() => updateStatus(record.studentId, 'present')}>
                          <CheckCircle2 className="h-5 w-5" />
                        </Button>
                        <Button type="button" size="lg" variant={record.status === 'absent' ? 'default' : 'outline'} className={`px-5 py-5 transition-all hover:scale-[1.05] active:scale-[0.95] ${record.status === 'absent' ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/25' : 'border-red-200 text-red-700 hover:bg-red-50'}`} onClick={() => updateStatus(record.studentId, 'absent')}>
                          <XCircle className="h-5 w-5" />
                        </Button>
                        <Button type="button" size="lg" variant={record.status === 'late' ? 'default' : 'outline'} className={`px-5 py-5 transition-all hover:scale-[1.05] active:scale-[0.95] ${record.status === 'late' ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/25' : 'border-amber-200 text-amber-700 hover:bg-amber-50'}`} onClick={() => updateStatus(record.studentId, 'late')}>
                          <Clock className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><History className="h-5 w-5 text-blue-500" />Historique de l&apos;appel</CardTitle>
              <CardDescription>Les 50 derniers enregistrements</CardDescription>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="text-center py-16">
                  <div className="mx-auto w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4"><History className="h-10 w-10 text-muted-foreground/50" /></div>
                  <p className="text-muted-foreground">Aucun historique disponible</p>
                  <p className="text-xs mt-1 text-muted-foreground/60">Cliquez sur l&apos;onglet pour charger l&apos;historique</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <Table className="text-sm">
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30"><TableHead>Date</TableHead><TableHead>Élève</TableHead><TableHead>Statut</TableHead><TableHead className="hidden sm:table-cell">Raison</TableHead></TableRow>
                    </TableHeader>
                    <TableBody className="[&>tr:nth-child(even)]:bg-muted/30">
                      {history.map((record) => (
                        <TableRow key={record.id} className="hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors">
                          <TableCell>{new Date(record.date).toLocaleDateString('fr-FR')}</TableCell>
                          <TableCell className="font-medium">{record.student?.fullName || 'Inconnu'}</TableCell>
                          <TableCell>{getStatusBadge(record.status)}</TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground text-xs max-w-[200px] truncate">{record.reason || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
