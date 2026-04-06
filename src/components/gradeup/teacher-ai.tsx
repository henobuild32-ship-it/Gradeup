'use client';

import { useAppStore } from '@/lib/store';
import AiChat from './ai-chat';

export default function TeacherAi() {
  const { user } = useAppStore();

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          🤖 IA Gradie — Assistant Professeur
        </h1>
        <p className="text-muted-foreground mt-1">
          Analysez vos classes, détectez les élèves faibles et obtenez des conseils pédagogiques.
        </p>
      </div>

      <AiChat schoolId={user.schoolId} userId={user.id} role="TEACHER" />
    </div>
  );
}
