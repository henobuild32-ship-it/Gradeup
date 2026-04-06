'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import type { NotificationInfo } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, BellOff, CheckCheck, Clock, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function StudentNotifications() {
  const user = useAppStore((s) => s.user);
  const [notifications, setNotifications] = useState<NotificationInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user?.schoolId) return;
    try {
      const res = await fetch(`/api/notifications?schoolId=${user.schoolId}&targetRole=STUDENT`);
      const data = await res.json();
      const sorted = (Array.isArray(data) ? data : []).sort(
        (a: NotificationInfo, b: NotificationInfo) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setNotifications(sorted);
    } catch (err) {
      console.error('Erreur chargement notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.schoolId]);

  useEffect(() => {
    setLoading(true);
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = async (notif: NotificationInfo) => {
    if (notif.read) return;
    try {
      const res = await fetch(`/api/notifications/${notif.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
        );
        toast.success('Notification marquée comme lue');
      }
    } catch (err) {
      console.error('Erreur marquage notification:', err);
      toast.error('Impossible de marquer la notification comme lue');
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;

    try {
      await Promise.all(
        unread.map((n) =>
          fetch(`/api/notifications/${n.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ read: true }),
          })
        )
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success('Toutes les notifications ont été marquées comme lues');
    } catch (err) {
      console.error('Erreur marquage notifications:', err);
      toast.error('Impossible de marquer toutes les notifications');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeTime = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return formatDate(dateStr);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Mes notifications</h1>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Mes notifications</h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount > 0
              ? `${unreadCount} notification(s) non lue(s)`
              : 'Aucune notification non lue'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <CheckCheck className="h-4 w-4 mr-1" />
            Tout marquer comme lu
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <BellOff className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium">Aucune notification</p>
            <p className="text-sm text-muted-foreground mt-1">
              Vous n&apos;avez pas encore reçu de notifications.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="max-h-[600px]">
          <div className="space-y-3">
            {notifications.map((notif) => (
              <Card
                key={notif.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  !notif.read ? 'border-blue-300 bg-blue-50/50' : ''
                }`}
                onClick={() => markAsRead(notif)}
              >
                <CardContent className="flex items-start gap-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      notif.read ? 'bg-muted' : 'bg-blue-100'
                    }`}
                  >
                    <Bell
                      className={`h-5 w-5 ${
                        notif.read ? 'text-muted-foreground' : 'text-blue-600'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-sm leading-relaxed ${
                          notif.read ? 'text-muted-foreground' : 'text-foreground font-medium'
                        }`}
                      >
                        {notif.message}
                      </p>
                      {!notif.read && (
                        <div className="h-2.5 w-2.5 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(notif.createdAt)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
