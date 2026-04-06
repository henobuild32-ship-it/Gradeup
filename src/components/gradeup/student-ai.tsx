'use client';

import { useAppStore } from '@/lib/store';
import AiChat from './ai-chat';
import { Card, CardContent } from '@/components/ui/card';

export default function StudentAi() {
  const user = useAppStore((s) => s.user);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🤖 IA Gradie - Mon Assistant</h1>
        <p className="text-muted-foreground mt-1">
          Obtenez des conseils personnalisés, analysez vos performances et découvrez des exercices adaptés.
        </p>
      </div>

      <Card className="border-0 shadow-lg">
        <CardContent className="p-0 h-[600px]">
          <AiChat
            schoolId={user.schoolId}
            userId={user.id}
            role="STUDENT"
          />
        </CardContent>
      </Card>
    </div>
  );
}
