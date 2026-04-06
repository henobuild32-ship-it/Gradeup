'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import type { GradeInfo } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { TrendingUp, Award, AlertTriangle, BarChart3 } from 'lucide-react';

export default function StudentGrades() {
  const user = useAppStore((s) => s.user);
  const [grades, setGrades] = useState<GradeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [trimester, setTrimester] = useState('1');

  useEffect(() => {
    if (!user?.schoolId || !user?.id) return;
    const fetchGrades = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/grades?schoolId=${user.schoolId}&studentId=${user.id}&trimester=${trimester}`);
        const data = await res.json();
        setGrades(Array.isArray(data) ? data : []);
      } catch (err) { console.error('Erreur chargement notes:', err); } finally { setLoading(false); }
    };
    fetchGrades();
  }, [user?.schoolId, user?.id, trimester]);

  const average = grades.length > 0
    ? grades.reduce((sum, g) => sum + (g.score / g.maxScore) * 20, 0) / grades.length
    : 0;

  const getGradeColor = (score: number, maxScore: number) => {
    const normalized = (score / maxScore) * 20;
    if (normalized >= 10) return 'text-emerald-600';
    if (normalized >= 7) return 'text-amber-600';
    return 'text-red-600';
  };

  const getGradeBg = (score: number, maxScore: number) => {
    const normalized = (score / maxScore) * 20;
    if (normalized >= 10) return 'bg-emerald-50 text-emerald-700';
    if (normalized >= 7) return 'bg-amber-50 text-amber-700';
    return 'bg-red-50 text-red-700';
  };

  const getProgressColor = (score: number, maxScore: number) => {
    const pct = (score / maxScore) * 100;
    if (pct >= 50) return 'bg-emerald-500';
    if (pct >= 35) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getAverageBadge = (avg: number) => {
    if (avg >= 14) return { label: 'Excellent', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    if (avg >= 10) return { label: 'Bien', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    if (avg >= 7) return { label: 'Passable', className: 'bg-amber-100 text-amber-700 border-amber-200' };
    return { label: 'Insuffisant', className: 'bg-red-100 text-red-700 border-red-200' };
  };

  const getAverageIcon = (avg: number) => {
    if (avg >= 14) return <Award className="h-8 w-8 text-emerald-600" />;
    if (avg >= 10) return <TrendingUp className="h-8 w-8 text-emerald-500" />;
    if (avg >= 7) return <AlertTriangle className="h-8 w-8 text-amber-500" />;
    return <AlertTriangle className="h-8 w-8 text-red-500" />;
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-9 w-80 rounded-md" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="mb-6 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-6">
        <h1 className="text-2xl font-bold">Mes notes</h1>
        <p className="text-sm text-muted-foreground mt-1">Suivez vos performances académiques par trimestre</p>
      </div>

      {/* Average Card */}
      <Card className="bg-gradient-to-r from-blue-50 via-blue-50 to-indigo-50 border-blue-200 shadow-sm">
        <CardContent className="flex items-center justify-between">
          <div>
            <CardDescription className="text-sm font-medium text-blue-700">
              Moyenne générale — Trimestre {trimester}
            </CardDescription>
            <p className="text-4xl font-bold mt-1" style={{ color: average >= 10 ? '#16a34a' : average >= 7 ? '#ca8a04' : '#dc2626' }}>
              {grades.length > 0 ? average.toFixed(2) : '—'}
              <span className="text-lg text-muted-foreground ml-1">/20</span>
            </p>
            <div className="mt-2">
              {grades.length > 0 && (() => { const badge = getAverageBadge(average); return <Badge variant="outline" className={badge.className}>{badge.label}</Badge>; })()}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {grades.length > 0 && getAverageIcon(average)}
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{grades.length} note(s)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trimester Tabs */}
      <Tabs value={trimester} onValueChange={setTrimester}>
        <TabsList>
          <TabsTrigger value="1" className="gap-1.5"><BarChart3 className="h-4 w-4" />Trimestre 1</TabsTrigger>
          <TabsTrigger value="2" className="gap-1.5"><BarChart3 className="h-4 w-4" />Trimestre 2</TabsTrigger>
          <TabsTrigger value="3" className="gap-1.5"><BarChart3 className="h-4 w-4" />Trimestre 3</TabsTrigger>
        </TabsList>

        <TabsContent value={trimester} className="mt-4">
          {grades.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4"><BarChart3 className="h-10 w-10 text-muted-foreground/50" /></div>
              <h3 className="text-lg font-semibold mb-1">Aucune note</h3>
              <p className="text-muted-foreground">Aucune note enregistrée pour ce trimestre.</p>
            </div>
          ) : (
            <Card className="shadow-sm">
              <CardContent className="p-0">
                <Table className="text-sm">
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="pl-6">Cours</TableHead>
                      <TableHead className="text-center">Note</TableHead>
                      <TableHead className="text-center">Note max</TableHead>
                      <TableHead className="text-center">Moyenne</TableHead>
                      <TableHead className="hidden sm:table-cell">Commentaire</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="[&>tr:nth-child(even)]:bg-muted/30">
                    {grades.map((grade) => {
                      const pct = Math.round((grade.score / grade.maxScore) * 100);
                      const normalized = (grade.score / grade.maxScore) * 20;
                      return (
                        <TableRow key={grade.id} className="hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors">
                          <TableCell className="pl-6 font-medium">{grade.course?.name || '—'}</TableCell>
                          <TableCell className="text-center">
                            <span className={`inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-sm font-bold ${getGradeBg(grade.score, grade.maxScore)}`}>
                              {grade.score}
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">{grade.maxScore}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1.5">
                              <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${getProgressColor(grade.score, grade.maxScore)}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground">{normalized.toFixed(1)}/20 ({pct}%)</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell max-w-[200px] truncate text-muted-foreground text-sm">{grade.comment || '—'}</TableCell>
                        </TableRow>
                      );
                    })}
                    {/* Average Row */}
                    <TableRow className="bg-gradient-to-r from-blue-50 to-indigo-50 font-bold">
                      <TableCell className="pl-6 text-blue-700">Moyenne</TableCell>
                      <TableCell colSpan={2}></TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-sm">{average.toFixed(2)}/20</Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell"></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
