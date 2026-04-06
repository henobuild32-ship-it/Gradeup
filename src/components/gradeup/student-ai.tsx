'use client';

import { useAppStore } from '@/lib/store';
import AiChat from './ai-chat';
import { Card, CardContent } from '@/components/ui/card';

export default function StudentAi() {
  const user = useAppStore((s) => s.user);

  if (!user) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="mb-6 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-lg">🤖</span>
          IA Gradie - Mon Assistant
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Obtenez des conseils personnalisés, analysez vos performances et découvrez des exercices adaptés.
        </p>
      </div>

      <Card className="border-0 shadow-lg shadow-blue-500/5">
        <CardContent className="p-0 h-[600px]">
          <AiChat schoolId={user.schoolId} userId={user.id} role="STUDENT" />
        </CardContent>
      </Card>
    </div>
  );
}
