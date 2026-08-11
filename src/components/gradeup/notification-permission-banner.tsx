'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Bell, X, ShieldCheck, Sparkles } from 'lucide-react';
import { registerPushNotifications } from '@/services/notifications/pushRegistration';
import { ensureWelcomeNotification } from '@/services/onesignal/welcome';
import { toast } from 'sonner';

export default function NotificationPermissionBanner() {
  const { user } = useAppStore();
  const [showBanner, setShowBanner] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || typeof window === 'undefined') return;

    if ('Notification' in window && 'serviceWorker' in navigator) {
      if (Notification.permission === 'default') {
        const dismissed = localStorage.getItem(`notif-banner-dismissed-${user.id}`);
        if (!dismissed) {
          setShowBanner(true);
        }
      } else if (Notification.permission === 'granted') {
        // Permission déjà accordée → s'abonner au push et envoyer la bienvenue
        registerPushNotifications(user.id).catch(() => {});
        ensureWelcomeNotification(user.id).catch(() => {});
      }
    }
  }, [user]);

  const handleEnable = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          await registerPushNotifications(user.id);
          // Notification de bienvenue (DB Realtime + push PWA + OneSignal) — une seule fois
          await ensureWelcomeNotification(user.id).catch(() => {});
          toast.success('🔔 Notifications activées avec succès !', {
            description: 'Vous recevrez désormais les alertes de cours, devoirs et messages en temps réel.',
          });
          setShowBanner(false);
        } else if (permission === 'denied') {
          toast.error('Notifications bloquées par votre navigateur', {
            description: 'Vous pouvez activer les notifications dans les paramètres de votre navigateur.',
          });
          setShowBanner(false);
        }
      }
    } catch (err) {
      console.error('[NotificationPermission] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    if (user) {
      localStorage.setItem(`notif-banner-dismissed-${user.id}`, 'true');
    }
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="mb-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-4 text-white shadow-xl shadow-blue-500/20 border border-blue-400/30 animate-fade-in relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wOCkiLz48L3N2Zz4=')] opacity-50 pointer-events-none" />
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-md shrink-0 mt-0.5 sm:mt-0">
            <Bell className="w-5 h-5 text-white animate-bounce" />
          </div>
          <div>
            <h4 className="text-sm font-bold flex items-center gap-1.5">
              <span>Activez les notifications en temps réel</span>
              <Sparkles className="w-4 h-4 text-amber-300" />
            </h4>
            <p className="text-xs text-blue-100 mt-0.5 leading-relaxed">
              Ne manquez plus les nouveaux cours, devoirs, notes, absences et messages importants.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center w-full sm:w-auto">
          <Button
            onClick={handleDismiss}
            variant="ghost"
            size="sm"
            className="text-xs text-blue-100 hover:text-white hover:bg-white/10"
          >
            Plus tard
          </Button>
          <Button
            onClick={handleEnable}
            disabled={loading}
            size="sm"
            className="bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs shadow-md"
          >
            <ShieldCheck className="w-4 h-4 mr-1.5 text-blue-600" />
            {loading ? 'Activation...' : 'Activer maintenant'}
          </Button>
        </div>
      </div>
    </div>
  );
}
