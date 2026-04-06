'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus,
  Bell,
  Send,
  Users,
  GraduationCap,
  UserCheck,
  Globe,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';

interface NotificationItem {
  id: string;
  senderId: string;
  targetRole: string;
  targetClassId: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface ClassItem {
  id: string;
  name: string;
}

const targetLabels: Record<string, string> = {
  ALL: 'Tout le monde',
  STUDENT: 'Tous les élèves',
  TEACHER: 'Professeurs',
  PARENT: 'Parents',
  CLASS: 'Une classe spécifique',
};

const targetIcons: Record<string, typeof Users> = {
  ALL: Globe,
  STUDENT: UserCheck,
  TEACHER: GraduationCap,
  PARENT: Users,
  CLASS: Users,
};

const targetColors: Record<string, string> = {
  ALL: 'bg-gray-100 text-gray-700 border-gray-200',
  STUDENT: 'bg-blue-100 text-blue-700 border-blue-200',
  TEACHER: 'bg-green-100 text-green-700 border-green-200',
  PARENT: 'bg-purple-100 text-purple-700 border-purple-200',
  CLASS: 'bg-amber-100 text-amber-700 border-amber-200',
};

export default function AdminNotifications() {
  const { user } = useAppStore();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formTarget, setFormTarget] = useState('ALL');
  const [formClassId, setFormClassId] = useState('');
  const [formMessage, setFormMessage] = useState('');

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`/api/notifications?schoolId=${user?.schoolId}`);
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch {
      toast.error('Erreur lors du chargement des notifications');
    } finally {
      setLoading(false);
    }
  }, [user?.schoolId]);

  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch(`/api/classes?schoolId=${user?.schoolId}`);
      const data = await res.json();
      setClasses(data.classes || []);
    } catch {
      console.error('Failed to fetch classes');
    }
  }, [user?.schoolId]);

  useEffect(() => {
    if (user?.schoolId) {
      fetchNotifications();
      fetchClasses();
    }
  }, [fetchNotifications, fetchClasses, user?.schoolId]);

  const resetForm = () => {
    setFormTarget('ALL');
    setFormClassId('');
    setFormMessage('');
  };

  const handleSubmit = async () => {
    if (!formMessage.trim()) {
      toast.error('Veuillez entrer un message');
      return;
    }
    if (formTarget === 'CLASS' && !formClassId) {
      toast.error('Veuillez sélectionner une classe');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: user?.schoolId,
          senderId: user?.id,
          targetRole: formTarget === 'CLASS' ? 'CLASS' : formTarget,
          targetClassId: formTarget === 'CLASS' ? formClassId : '',
          message: formMessage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      toast.success('Notification envoyée avec succès');
      setDialogOpen(false);
      resetForm();
      fetchNotifications();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'envoi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-muted-foreground">Envoyez et gérez les notifications de l&apos;école</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Envoyer une notification
        </Button>
      </div>

      {/* Send Notification Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-600" />
              Envoyer une notification
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notif-target">Destinataire</Label>
              <Select value={formTarget} onValueChange={(v) => { setFormTarget(v); setFormClassId(''); }}>
                <SelectTrigger id="notif-target">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tout le monde</SelectItem>
                  <SelectItem value="STUDENT">Tous les élèves</SelectItem>
                  <SelectItem value="TEACHER">Professeurs</SelectItem>
                  <SelectItem value="PARENT">Parents</SelectItem>
                  <SelectItem value="CLASS">Une classe spécifique</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formTarget === 'CLASS' && (
              <div className="space-y-2">
                <Label htmlFor="notif-class">Classe</Label>
                <Select value={formClassId} onValueChange={setFormClassId}>
                  <SelectTrigger id="notif-class">
                    <SelectValue placeholder="Sélectionner une classe" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notif-message">Message</Label>
              <Textarea
                id="notif-message"
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
                placeholder="Entrez votre message ici..."
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Ce message sera envoyé à {targetLabels[formTarget]?.toLowerCase() || 'tous'}.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !formMessage.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {submitting ? (
                'Envoi en cours...'
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notifications List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-600" />
            Notifications envoyées
            {notifications.length > 0 && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                {notifications.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">Aucune notification</h3>
              <p className="text-muted-foreground mb-4">
                Envoyez votre première notification à la communauté scolaire
              </p>
              <Button onClick={() => { resetForm(); setDialogOpen(true); }} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Envoyer une notification
              </Button>
            </div>
          ) : (
            <ScrollArea className="max-h-[600px]">
              <div className="space-y-3">
                {notifications.map((n) => {
                  const TargetIcon = targetIcons[n.targetRole] || Globe;
                  return (
                    <div
                      key={n.id}
                      className="p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg shrink-0 ${targetColors[n.targetRole]?.split(' ')[0] || 'bg-gray-100'}`}>
                          <TargetIcon className={`h-4 w-4 ${targetColors[n.targetRole]?.split(' ')[1] || 'text-gray-600'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge
                              variant="outline"
                              className={`text-xs ${targetColors[n.targetRole] || ''}`}
                            >
                              {targetLabels[n.targetRole] || n.targetRole}
                            </Badge>
                            {n.targetClassId && (
                              <Badge variant="secondary" className="text-xs">
                                {classes.find((c) => c.id === n.targetClassId)?.name || 'Classe'}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm whitespace-pre-wrap mb-2">{n.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {n.createdAt
                              ? new Date(n.createdAt).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
