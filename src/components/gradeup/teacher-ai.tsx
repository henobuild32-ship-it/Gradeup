'use client';

import { useAppStore } from '@/lib/store';
import AiChat from './ai-chat';

export default function TeacherAi() {
  const { user } = useAppStore();

  if (!user) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="mb-6 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-lg">🤖</span>
          IA Gradie — Assistant Professeur
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Analysez vos classes, détectez les élèves faibles et obtenez des conseils pédagogiques.
        </p>
      </div>

      <AiChat schoolId={user.schoolId} userId={user.id} role="TEACHER" />
    </div>
  );
}
