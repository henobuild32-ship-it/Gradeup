'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import type { AttendanceInfo } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CalendarCheck,
  CalendarX,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  UserCheck,
  UserX,
  AlertTriangle,
} from 'lucide-react';

export default function StudentAttendance() {
  const user = useAppStore((s) => s.user);
  const [attendance, setAttendance] = useState<AttendanceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  useEffect(() => {
    if (!user?.schoolId || !user?.id) return;
    const fetchAttendance = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/attendance?schoolId=${user.schoolId}&studentId=${user.id}`);
        const data = await res.json();
        const sorted = (Array.isArray(data) ? data : []).sort(
          (a: AttendanceInfo, b: AttendanceInfo) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setAttendance(sorted);
      } catch (err) {
        console.error('Erreur chargement présences:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, [user?.schoolId, user?.id]);

  const months = useMemo(() => {
    const monthSet = new Set<string>();
    attendance.forEach((a) => {
      const d = new Date(a.date);
      monthSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    });
    return Array.from(monthSet).sort().reverse();
  }, [attendance]);

  const filteredAttendance = useMemo(() => {
    if (selectedMonth === 'all') return attendance;
    return attendance.filter((a) => {
      const d = new Date(a.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return key === selectedMonth;
    });
  }, [attendance, selectedMonth]);

  const totalPresent = attendance.filter((a) => a.status === 'present').length;
  const totalAbsent = attendance.filter((a) => a.status === 'absent').length;
  const totalLate = attendance.filter((a) => a.status === 'late').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Présent</Badge>;
      case 'absent':
        return <Badge className="bg-red-100 text-red-700 border-red-200">Absent</Badge>;
      case 'late':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">En retard</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getMonthLabel = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const d = new Date(parseInt(year), parseInt(month) - 1);
    return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Ma présence</h1>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-10 w-64 rounded-md" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ma présence</h1>
        <p className="text-muted-foreground mt-1">
          Historique de vos présences et absences
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{totalPresent}</p>
              <CardDescription>Présent(s)</CardDescription>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <UserX className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{totalAbsent}</p>
              <CardDescription>Absent(s)</CardDescription>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{totalLate}</p>
              <CardDescription>En retard</CardDescription>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Month filter */}
      {months.length > 0 && (
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Tous les mois" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les mois</SelectItem>
              {months.map((m) => (
                <SelectItem key={m} value={m}>
                  {getMonthLabel(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Attendance table */}
      {filteredAttendance.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium">Aucun enregistrement</p>
            <p className="text-sm text-muted-foreground mt-1">
              Aucune donnée de présence disponible.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Date</TableHead>
                    <TableHead className="text-center">Statut</TableHead>
                    <TableHead className="hidden sm:table-cell">Motif</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttendance.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-2">
                          <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{formatDate(record.date)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(record.status)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm max-w-[250px] truncate">
                        {record.reason || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
