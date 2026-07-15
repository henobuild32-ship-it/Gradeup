'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import type { GradeInfo } from '@/lib/types';
import { Card, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { TrendingUp, Award, AlertTriangle, BarChart3, RefreshCw } from 'lucide-react';

export default function StudentGrades() {
  const user = useAppStore((s) => s.user);
  const [grades, setGrades] = useState<GradeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [trimester, setTrimester] = useState('1');
  const [refreshing, setRefreshing] = useState(false);

  const fetchGrades = async (showLoading = true) => {
    if (!user?.schoolId || !user?.id) return;
    if (showLoading) setLoading(true);
    try {
      const res = await fetch(`/api/grades?schoolId=${user.schoolId}&studentId=${user.id}&trimester=${trimester}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setGrades(Array.isArray(data.grades) ? data.grades : []);
    } catch {
      // ignore
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrades();
  }, [user?.schoolId, user?.id, trimester]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchGrades(false);
    await new Promise(r => setTimeout(r, 600));
    setRefreshing(false);
  };

  const average = grades.length > 0
    ? grades.reduce((sum, g) => sum + (g.score / g.maxScore) * 20, 0) / grades.length
    : 0;

  const getGradeColor = (score: number, maxScore: number) => {
    const val = (score / maxScore) * 20;
    if (val >= 16) return 'text-green-600 dark:text-green-400';
    if (val >= 14) return 'text-blue-600 dark:text-blue-400';
    if (val >= 12) return 'text-yellow-600 dark:text-yellow-400';
    if (val >= 10) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getGradeBg = (score: number, maxScore: number) => {
    const val = (score / maxScore) * 20;
    if (val >= 16) return 'bg-green-50 text-green-700 border border-green-200';
    if (val >= 14) return 'bg-blue-50 text-blue-700 border border-blue-200';
    if (val >= 12) return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
    if (val >= 10) return 'bg-orange-50 text-orange-700 border border-orange-200';
    return 'bg-red-50 text-red-700 border border-red-200';
  };

  const getProgressColor = (score: number, maxScore: number) => {
    const val = (score / maxScore) * 20;
    if (val >= 16) return 'bg-green-500';
    if (val >= 14) return 'bg-blue-500';
    if (val >= 12) return 'bg-yellow-500';
    if (val >= 10) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getAverageBadge = (avg: number) => {
    if (avg >= 16) return { label: '🟢 Excellent', className: 'bg-green-50 text-green-700 border-green-200' };
    if (avg >= 14) return { label: '🔵 Très bien', className: 'bg-blue-50 text-blue-700 border-blue-200' };
    if (avg >= 12) return { label: '🟡 Bien', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' };
    if (avg >= 10) return { label: '🟠 Assez bien', className: 'bg-orange-50 text-orange-700 border-orange-200' };
    return { label: '🔴 Insuffisant', className: 'bg-red-50 text-red-700 border-red-200' };
  };

  const getAverageIcon = (avg: number) => {
    if (avg >= 14) return <Award className="h-8 w-8 text-emerald-600 animate-pulse-soft" />;
    if (avg >= 10) return <TrendingUp className="h-8 w-8 text-blue-500" />;
    return <AlertTriangle className="h-8 w-8 text-red-500" />;
  };

  const getSparkline = () => {
    if (grades.length < 2) return null;
    const width = 120;
    const height = 30;
    const maxVal = 20;
    const minVal = 0;
    
    const points = grades.map((g, idx) => {
      const x = (idx / (grades.length - 1)) * (width - 10) + 5;
      const normalizedScore = (g.score / g.maxScore) * 20;
      const y = height - ((normalizedScore - minVal) / (maxVal - minVal)) * (height - 10) - 5;
      return `${x},${y}`;
    }).join(' ');
    
    return (
      <svg className="w-28 h-8 text-blue-600 dark:text-blue-400 shrink-0 hidden sm:block" viewBox={`0 0 ${width} ${height}`}>
        <polyline fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
        {grades.map((g, idx) => {
          const x = (idx / (grades.length - 1)) * (width - 10) + 5;
          const normalizedScore = (g.score / g.maxScore) * 20;
          const y = height - ((normalizedScore - minVal) / (maxVal - minVal)) * (height - 10) - 5;
          return (
            <circle key={idx} cx={x} cy={y} r="2.5" className="fill-blue-600 dark:fill-blue-400 stroke-background stroke-[1.5px]" />
          );
        })}
      </svg>
    );
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
      <div className="mb-6 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Mes notes</h1>
          <p className="text-sm text-muted-foreground mt-1">Suivez vos performances académiques par trimestre</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          className="rounded-full shadow-sm"
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Actualisation...' : 'Actualiser'}
        </Button>
      </div>

      {/* Average Card */}
      <Card className="bg-gradient-to-r from-blue-50 via-blue-50 to-indigo-50 border-blue-200 shadow-sm relative overflow-hidden">
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <CardDescription className="text-sm font-medium text-blue-700">
              Moyenne générale — Trimestre {trimester}
            </CardDescription>
            <p className="text-4xl font-bold mt-1" style={{ color: average >= 16 ? '#16a34a' : average >= 14 ? '#2563eb' : average >= 12 ? '#ca8a04' : average >= 10 ? '#ea580c' : '#dc2626' }}>
              {grades.length > 0 ? average.toFixed(2) : '—'}
              <span className="text-lg text-muted-foreground ml-1">/20</span>
            </p>
            <div className="mt-2">
              {grades.length > 0 && (() => { const badge = getAverageBadge(average); return <Badge variant="outline" className={badge.className}>{badge.label}</Badge>; })()}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {grades.length >= 2 && getSparkline()}
            <div className="flex items-center gap-3">
              {grades.length > 0 && getAverageIcon(average)}
              <div className="text-right">
                <p className="text-sm text-muted-foreground">{grades.length} note(s)</p>
              </div>
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
            <Card className="shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className="text-sm min-w-[600px]">
                    <TableHeader className="sticky top-0 bg-muted/50 backdrop-blur z-10">
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="pl-6">Cours</TableHead>
                        <TableHead className="text-center">Note</TableHead>
                        <TableHead className="text-center">Note max</TableHead>
                        <TableHead className="text-center">Moyenne</TableHead>
                        <TableHead className="hidden sm:table-cell">Commentaire/Appréciation</TableHead>
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
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
