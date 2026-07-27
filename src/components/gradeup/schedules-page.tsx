'use client';

import { useMemo, useState } from 'react';
import { useAppStore } from '@/lib/store';
import WeeklyScheduleView from './weekly-schedule-view';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';

export default function SchedulesPage() {
  const user = useAppStore((state) => state.user);
  const classes = useMemo(
    () => user?.classEnrollments?.map((enrollment) => enrollment.class) || [],
    [user?.classEnrollments]
  );
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const activeClassId = selectedClassId || classes[0]?.id || '';

  if (!user) {
    return null;
  }

  const selectedClass = classes.find((cls) => cls.id === activeClassId);
  const roleLabel = user.role === 'TEACHER' ? 'enseignant' : user.role === 'STUDENT' ? 'élève' : 'utilisateur';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Emploi du temps</h1>
          <p className="text-sm text-muted-foreground">
            Consultez les horaires de cours publiés pour votre classe.
          </p>
        </div>
        {classes.length > 1 && (
          <div className="w-full max-w-sm">
            <Select value={activeClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Choisir une classe" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name} ({cls.level})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {classes.length === 0 ? (
        <Card className="border-dashed border-2 border-muted/50">
          <CardContent className="flex flex-col items-center justify-center gap-3 p-10 text-center">
            <AlertTriangle className="w-10 h-10 text-blue-500" />
            <div>
              <h2 className="text-lg font-semibold">Aucune classe assignée</h2>
              <p className="text-sm text-muted-foreground">
                Aucun emploi du temps n&apos;a encore été attribué à votre profil. Contactez votre administrateur pour que vos cours et votre classe soient bien configurés.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : selectedClass ? (
        <WeeklyScheduleView
          schoolId={user.schoolId}
          classId={selectedClass.id}
          classNameLabel={selectedClass.name}
        />
      ) : null}
    </div>
  );
}
