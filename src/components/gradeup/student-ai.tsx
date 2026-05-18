'use client';

import { useAppStore } from '@/lib/store';
import GradieChat from './gradie/GradieChat';

export default function StudentAi() {
  const user = useAppStore((s) => s.user);

  if (!user) return null;

  return (
    <div className="flex flex-col space-y-4 animate-fade-in h-full">
      <div className="mb-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-lg">🤖</span>
          IA Gradie — Mon Assistante
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Posez vos questions sur vos cours, partagez des documents et obtenez un suivi personnalisé de vos performances.
        </p>
      </div>

      <div className="flex-1 min-h-0">
        <GradieChat
          schoolId={user.schoolId}
          userId={user.id}
          userRole="STUDENT"
          userName={user.fullName}
        />
      </div>
    </div>
  );
}
