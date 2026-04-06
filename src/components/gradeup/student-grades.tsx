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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
        const res = await fetch(
          `/api/grades?schoolId=${user.schoolId}&studentId=${user.id}&trimester=${trimester}`
        );
        const data = await res.json();
        setGrades(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Erreur chargement notes:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchGrades();
  }, [user?.schoolId, user?.id, trimester]);

  const average =
    grades.length > 0
      ? grades.reduce((sum, g) => sum + (g.score / g.maxScore) * 20, 0) / grades.length
      : 0;

  const getGradeColor = (score: number, maxScore: number) => {
    const normalized = (score / maxScore) * 20;
    if (normalized >= 10) return 'text-green-600';
    if (normalized >= 7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = (score: number, maxScore: number) => {
    const pct = (score / maxScore) * 100;
    if (pct >= 50) return 'bg-green-500';
    if (pct >= 35) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getAverageBadge = (avg: number) => {
    if (avg >= 14) return <Badge className="bg-green-100 text-green-700 border-green-200">Excellent</Badge>;
    if (avg >= 10) return <Badge className="bg-green-100 text-green-700 border-green-200">Bien</Badge>;
    if (avg >= 7) return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Passable</Badge>;
    return <Badge className="bg-red-100 text-red-700 border-red-200">Insuffisant</Badge>;
  };

  const getAverageIcon = (avg: number) => {
    if (avg >= 14) return <Award className="h-8 w-8 text-green-600" />;
    if (avg >= 10) return <TrendingUp className="h-8 w-8 text-green-500" />;
    if (avg >= 7) return <AlertTriangle className="h-8 w-8 text-yellow-500" />;
    return <AlertTriangle className="h-8 w-8 text-red-500" />;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Mes notes</h1>
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-9 w-80 rounded-md" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mes notes</h1>
        <p className="text-muted-foreground mt-1">
          Suivez vos performances académiques par trimestre
        </p>
      </div>

      {/* Average Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-blue-200">
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
              {grades.length > 0 && getAverageBadge(average)}
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
          <TabsTrigger value="1">Trimestre 1</TabsTrigger>
          <TabsTrigger value="2">Trimestre 2</TabsTrigger>
          <TabsTrigger value="3">Trimestre 3</TabsTrigger>
        </TabsList>

        <TabsContent value={trimester} className="mt-4">
          {grades.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-medium">Aucune note</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Aucune note enregistrée pour ce trimestre.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Cours</TableHead>
                      <TableHead className="text-center">Note</TableHead>
                      <TableHead className="text-center">Note max</TableHead>
                      <TableHead className="text-center">Moyenne</TableHead>
                      <TableHead className="hidden sm:table-cell">Commentaire</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grades.map((grade) => {
                      const pct = Math.round((grade.score / grade.maxScore) * 100);
                      const normalized = (grade.score / grade.maxScore) * 20;
                      return (
                        <TableRow key={grade.id}>
                          <TableCell className="pl-6 font-medium">
                            {grade.course?.name || '—'}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`text-lg font-bold ${getGradeColor(grade.score, grade.maxScore)}`}>
                              {grade.score}
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {grade.maxScore}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1.5">
                              <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${getProgressColor(grade.score, grade.maxScore)}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {normalized.toFixed(1)}/20 ({pct}%)
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell max-w-[200px] truncate text-muted-foreground text-sm">
                            {grade.comment || '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
