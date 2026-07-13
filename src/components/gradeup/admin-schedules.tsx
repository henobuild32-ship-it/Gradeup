'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { subscribeToTable, isRealtimeEnabled } from '@/lib/realtime';
import {
  CalendarDays,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Clock,
  BookOpen,
  User,
  School,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface ClassInfo {
  id: string;
  name: string;
  level: string;
}

interface CourseInfo {
  id: string;
  name: string;
  teacherId: string;
  teacher: {
    id: string;
    fullName: string;
  };
}

interface ScheduleSlot {
  id: string;
  courseId: string;
  dayOfWeek: number; // 1 to 6
  startTime: string; // "hh:mm"
  endTime: string;
  room: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  exceptions: string; // stringified array
  course: {
    id: string;
    name: string;
    teacher: {
      id: string;
      fullName: string;
    };
  };
}

const DAYS = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
];

const TIME_SLOTS = [
  { start: '08:00', end: '09:30', label: '1ère Période' },
  { start: '09:30', end: '11:00', label: '2ème Période' },
  { start: '11:00', end: '11:30', label: 'Récréation', isBreak: true },
  { start: '11:30', end: '13:00', label: '3ème Période' },
  { start: '13:00', end: '14:30', label: '4ème Période' },
  { start: '14:30', end: '16:00', label: '5ème Période' },
];

export default function AdminSchedules() {
  const { user } = useAppStore();
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [courses, setCourses] = useState<CourseInfo[]>([]);
  const [schedules, setSchedules] = useState<ScheduleSlot[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingGrid, setLoadingGrid] = useState(false);

  // Dialog Add/Edit
  const [showAddEdit, setShowAddEdit] = useState(false);
  const [editingSlot, setEditingSlot] = useState<ScheduleSlot | null>(null);
  const [slotDay, setSlotDay] = useState<number>(1);
  const [slotStart, setSlotStart] = useState<string>('08:00');
  const [slotEnd, setSlotEnd] = useState<string>('09:30');
  const [slotCourseId, setSlotCourseId] = useState<string>('');
  const [slotRoom, setSlotRoom] = useState<string>('');
  const [slotPeriodStart, setSlotPeriodStart] = useState<string>('');
  const [slotPeriodEnd, setSlotPeriodEnd] = useState<string>('');
  const [slotExceptions, setSlotExceptions] = useState<string>(''); // comma separated dates
  const [savingSlot, setSavingSlot] = useState(false);

  // Auto Resolved Teacher
  const [resolvedTeacherName, setResolvedTeacherName] = useState<string>('');

  // Dialog Duplicate
  const [showDuplicate, setShowDuplicate] = useState(false);
  const [targetClassId, setTargetClassId] = useState<string>('');
  const [duplicating, setDuplicating] = useState(false);

  const fetchClassesAndCourses = useCallback(async () => {
    if (!user?.schoolId) return;
    try {
      const classesRes = await fetch(`/api/classes?schoolId=${user.schoolId}`);
      const classesData = await classesRes.json();
      const loadedClasses = Array.isArray(classesData) ? classesData : Array.isArray(classesData.classes) ? classesData.classes : [];
      setClasses(loadedClasses);

      if (loadedClasses.length > 0) {
        setSelectedClassId(loadedClasses[0].id);
      }
    } catch {
      toast.error('Erreur lors du chargement des classes');
    } finally {
      setLoading(false);
    }
  }, [user?.schoolId]);

  const fetchSchedulesAndCoursesOfClass = useCallback(async () => {
    if (!selectedClassId || !user?.schoolId) return;
    setLoadingGrid(true);
    try {
      const [schedRes, coursesRes] = await Promise.all([
        fetch(`/api/schedules?schoolId=${user.schoolId}&classId=${selectedClassId}`),
        fetch(`/api/courses?schoolId=${user.schoolId}&classId=${selectedClassId}`),
      ]);

      if (schedRes.ok) {
        setSchedules(await schedRes.json());
      }
      if (coursesRes.ok) {
        const cData = await coursesRes.json();
        setCourses(Array.isArray(cData.courses) ? cData.courses : Array.isArray(cData) ? cData : []);
      }
    } catch {
      toast.error('Erreur lors de la récupération de la grille');
    } finally {
      setLoadingGrid(false);
    }
  }, [selectedClassId, user?.schoolId]);

  useEffect(() => {
    fetchClassesAndCourses();
  }, [fetchClassesAndCourses]);

  useEffect(() => {
    fetchSchedulesAndCoursesOfClass();
  }, [selectedClassId, fetchSchedulesAndCoursesOfClass]);

  // Real-time synchronization
  useEffect(() => {
    if (!user?.schoolId) return;

    const handleRealtime = () => {
      fetchSchedulesAndCoursesOfClass();
    };

    const unsubscribe = subscribeToTable({
      table: 'CourseSchedule',
      channelName: `realtime-schedules-admin-${user.schoolId}`,
      onEvent: handleRealtime,
    });

    const pollInterval = setInterval(() => {
      fetchSchedulesAndCoursesOfClass();
    }, isRealtimeEnabled() ? 15000 : 5000);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, [user?.schoolId, fetchSchedulesAndCoursesOfClass]);

  // Auto-resolve teacher assignment on course selection
  useEffect(() => {
    if (!slotCourseId) {
      setResolvedTeacherName('');
      return;
    }
    const match = courses.find((c) => c.id === slotCourseId);
    if (match && match.teacher) {
      setResolvedTeacherName(match.teacher.fullName);
    } else {
      setResolvedTeacherName('');
    }
  }, [slotCourseId, courses]);

  const handleOpenAdd = (day: number, start: string, end: string) => {
    setEditingSlot(null);
    setSlotDay(day);
    setSlotStart(start);
    setSlotEnd(end);
    setSlotCourseId('');
    setSlotRoom('');
    setSlotPeriodStart('');
    setSlotPeriodEnd('');
    setSlotExceptions('');
    setResolvedTeacherName('');
    setShowAddEdit(true);
  };

  const handleOpenEdit = (slot: ScheduleSlot) => {
    setEditingSlot(slot);
    setSlotDay(slot.dayOfWeek);
    setSlotStart(slot.startTime);
    setSlotEnd(slot.endTime);
    setSlotCourseId(slot.courseId);
    setSlotRoom(slot.room);
    setSlotPeriodStart(slot.periodStart ? slot.periodStart.split('T')[0] : '');
    setSlotPeriodEnd(slot.periodEnd ? slot.periodEnd.split('T')[0] : '');

    try {
      const arr = JSON.parse(slot.exceptions || '[]');
      setSlotExceptions(Array.isArray(arr) ? arr.join(', ') : '');
    } catch {
      setSlotExceptions('');
    }

    setShowAddEdit(true);
  };

  const handleSaveSlot = async () => {
    if (!slotCourseId || !user?.schoolId) {
      toast.error('Veuillez sélectionner un cours');
      return;
    }

    setSavingSlot(true);
    const parsedExceptions = slotExceptions
      .split(',')
      .map((d) => d.trim())
      .filter((d) => d.length > 0);

    const payload = {
      id: editingSlot?.id,
      schoolId: user.schoolId,
      courseId: slotCourseId,
      dayOfWeek: slotDay,
      startTime: slotStart,
      endTime: slotEnd,
      room: slotRoom.trim(),
      periodStart: slotPeriodStart || null,
      periodEnd: slotPeriodEnd || null,
      exceptions: JSON.stringify(parsedExceptions),
    };

    try {
      const method = editingSlot ? 'PUT' : 'POST';
      const res = await fetch('/api/schedules', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(editingSlot ? 'Créneau modifié' : 'Créneau horaire ajouté');
        setShowAddEdit(false);
        fetchSchedulesAndCoursesOfClass();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Erreur lors de l\'enregistrement');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setSavingSlot(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('Retirer ce créneau de la grille de cours ?')) return;

    try {
      const res = await fetch(`/api/schedules?id=${slotId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Créneau horaire retiré');
        fetchSchedulesAndCoursesOfClass();
      } else {
        toast.error('Erreur lors de la suppression');
      }
    } catch {
      toast.error('Erreur réseau');
    }
  };

  const handleDuplicate = async () => {
    if (!selectedClassId || !targetClassId || !user?.schoolId) return;
    setDuplicating(true);
    try {
      const res = await fetch('/api/schedules/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: user.schoolId,
          sourceClassId: selectedClassId,
          targetClassId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Emploi du temps dupliqué !');
        setShowDuplicate(false);
      } else {
        toast.error(data.error || 'Erreur lors de la duplication');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setDuplicating(false);
    }
  };

  const getSlot = (dayValue: number, start: string, end: string) => {
    return schedules.find(
      (s) =>
        s.dayOfWeek === dayValue &&
        ((s.startTime <= start && s.endTime > start) ||
          (s.startTime >= start && s.startTime < end))
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-6 gap-3 h-80">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 p-6 lg:p-8 text-white shadow-xl shadow-blue-500/20">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wOCkiLz48L3N2Zz4=')] opacity-50" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-white/15 backdrop-blur-sm">
              <CalendarDays className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Emploi du Temps</h1>
              <p className="text-blue-100 text-sm">
                Planification hebdomadaire automatisée des cours en temps réel
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowDuplicate(true)}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 border-white/20 text-white"
            >
              <Copy className="w-4 h-4 mr-2" />
              Dupliquer la grille
            </Button>
            <Button
              onClick={fetchSchedulesAndCoursesOfClass}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 border-white/20 text-white"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Class Selector */}
      <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-xl border max-w-sm">
        <School className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium text-muted-foreground">Classe cible :</span>
        <Select value={selectedClassId} onValueChange={setSelectedClassId}>
          <SelectTrigger className="bg-background h-9 text-sm flex-1">
            <SelectValue placeholder="Sélectionnez une classe..." />
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

      {/* Schedule Grid */}
      <Card className="shadow-lg border-2 border-blue-50/50">
        <CardContent className="p-4 md:p-6 overflow-x-auto">
          {loadingGrid ? (
            <div className="space-y-4 py-12">
              <div className="flex justify-center">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
              <p className="text-center text-sm text-muted-foreground">Mise à jour de la grille...</p>
            </div>
          ) : (
            <div className="min-w-[800px] border rounded-xl overflow-hidden">
              {/* Header Days */}
              <div className="grid grid-cols-7 bg-muted/40 text-center font-semibold text-sm border-b">
                <div className="p-3 border-r text-left text-xs text-muted-foreground uppercase tracking-wider font-bold">
                  Créneau
                </div>
                {DAYS.map((d) => (
                  <div key={d.value} className="p-3 border-r last:border-0 text-foreground">
                    {d.label}
                  </div>
                ))}
              </div>

              {/* Grid Rows */}
              <div className="divide-y">
                {TIME_SLOTS.map((slot) => (
                  <div key={slot.start} className="grid grid-cols-7 min-h-[90px]">
                    {/* Time Slot column */}
                    <div className="p-3 border-r bg-muted/20 flex flex-col justify-center text-left">
                      <span className="text-xs font-bold text-muted-foreground">{slot.label}</span>
                      <span className="text-sm font-semibold text-foreground mt-1 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        {slot.start} – {slot.end}
                      </span>
                    </div>

                    {/* Break or Days columns */}
                    {slot.isBreak ? (
                      <div className="col-span-6 bg-amber-50/30 dark:bg-amber-950/10 flex items-center justify-center text-xs font-bold tracking-widest text-amber-700 dark:text-amber-500 uppercase">
                        ☕️  {slot.label}
                      </div>
                    ) : (
                      DAYS.map((day) => {
                        const cell = getSlot(day.value, slot.start, slot.end);
                        return (
                          <div
                            key={day.value}
                            className="p-2 border-r last:border-0 flex flex-col justify-center group relative min-h-[90px] hover:bg-blue-50/10 transition-colors"
                          >
                            {cell ? (
                              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-2 border-blue-200 dark:border-blue-900 rounded-xl p-2.5 shadow-sm text-left flex flex-col justify-between h-full">
                                <div>
                                  <p className="text-sm font-bold text-blue-800 dark:text-blue-400 line-clamp-1">
                                    {cell.course.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1 font-medium">
                                    <User className="w-3 h-3 text-emerald-500 shrink-0" />
                                    <span className="truncate">{cell.course.teacher.fullName}</span>
                                  </p>
                                </div>
                                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-blue-100 dark:border-blue-900/50">
                                  <Badge className="bg-blue-600 text-white hover:bg-blue-600 text-[9px] px-1.5 py-0 h-4">
                                    {cell.room || 'N/A'}
                                  </Badge>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => handleOpenEdit(cell)}
                                      className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSlot(cell.id)}
                                      className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleOpenAdd(day.value, slot.start, slot.end)}
                                className="opacity-0 group-hover:opacity-100 absolute inset-0 flex items-center justify-center bg-blue-600/10 hover:bg-blue-600/20 text-blue-700 transition-all rounded"
                              >
                                <Plus className="w-6 h-6" />
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={showAddEdit} onOpenChange={setShowAddEdit}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-blue-600" />
              {editingSlot ? 'Modifier le créneau' : 'Planifier un cours'}
            </DialogTitle>
            <DialogDescription>
              Définissez la matière, la salle et les options de validité temporelle.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Jour</Label>
                <Select value={String(slotDay)} onValueChange={(v) => setSlotDay(parseInt(v))}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d) => (
                      <SelectItem key={d.value} value={String(d.value)}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Salle de classe</Label>
                <Input
                  placeholder="Ex: Salle A"
                  value={slotRoom}
                  onChange={(e) => setSlotRoom(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Heure début</Label>
                <Input type="time" value={slotStart} onChange={(e) => setSlotStart(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label>Heure fin</Label>
                <Input type="time" value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)} className="h-9" />
              </div>
            </div>

            <div className="space-y-1.5 bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30">
              <Label className="font-semibold text-blue-900 dark:text-blue-300">Sélection du cours *</Label>
              <Select value={slotCourseId} onValueChange={setSlotCourseId}>
                <SelectTrigger className="bg-background h-9 mt-1">
                  <SelectValue placeholder="Choisir un cours..." />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Intelligent teacher resolution display */}
              {resolvedTeacherName && (
                <div className="flex items-center gap-1.5 mt-2.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                  <User className="w-3.5 h-3.5 shrink-0" />
                  <span>Enseignant attribué : {resolvedTeacherName} (automatisé)</span>
                </div>
              )}
            </div>

            <Separator />

            {/* Validity and exceptions */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Validité & Exceptions (Optionnel)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Date début</Label>
                  <Input type="date" value={slotPeriodStart} onChange={(e) => setSlotPeriodStart(e.target.value)} className="h-9 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Date fin</Label>
                  <Input type="date" value={slotPeriodEnd} onChange={(e) => setSlotPeriodEnd(e.target.value)} className="h-9 text-xs" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Dates d'exceptions (ex: jours fériés, séparés par virgule)</Label>
                <Input
                  placeholder="2026-05-01, 2026-12-25"
                  value={slotExceptions}
                  onChange={(e) => setSlotExceptions(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddEdit(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSaveSlot}
              disabled={savingSlot || !slotCourseId}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md"
            >
              {savingSlot ? 'Enregistrement...' : 'Enregistrer créneau'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Dialog */}
      <Dialog open={showDuplicate} onOpenChange={setShowDuplicate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="w-5 h-5 text-blue-600" />
              Dupliquer l'emploi du temps
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3 bg-blue-50/50 dark:bg-blue-950/20 p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/30">
              <AlertTriangle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-900 dark:text-blue-300 leading-relaxed font-medium">
                Cette action va copier l'intégralité de la grille horaire de la classe actuelle vers la classe cible. Les matières manquantes seront créées automatiquement avec le même enseignant.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Classe cible *</Label>
              <Select value={targetClassId} onValueChange={setTargetClassId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Sélectionnez la classe cible..." />
                </SelectTrigger>
                <SelectContent>
                  {classes
                    .filter((c) => c.id !== selectedClassId)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDuplicate(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleDuplicate}
              disabled={duplicating || !targetClassId}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {duplicating ? 'Duplication...' : 'Confirmer duplication'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Separator() {
  return <div className="h-px bg-muted w-full my-2" />;
}
