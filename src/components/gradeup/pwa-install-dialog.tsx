'use client';

import { useState, useEffect } from 'react';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Smartphone, Apple, X, Download, CheckCircle2, Share, Plus } from 'lucide-react';

export default function PWAInstallDialog() {
  const { isInstallable, isAppInstalled, isIOS, installPWA } = usePWAInstall();
  const [showDialog, setShowDialog] = useState(false);
  const [installStep, setInstallStep] = useState<'idle' | 'installing' | 'done'>('idle');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const wasDismissed = localStorage.getItem('pwa-install-dismissed');
    if (wasDismissed) setDismissed(true);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', 'true');
    setDismissed(true);
    setShowDialog(false);
  };

  const handleInstall = async () => {
    if (isIOS) {
      // iOS: show instructions
      setInstallStep('installing');
      return;
    }

    if (isInstallable) {
      setInstallStep('installing');
      const success = await installPWA();
      if (success) {
        setInstallStep('done');
        setTimeout(() => setShowDialog(false), 2000);
      } else {
        setInstallStep('idle');
      }
    }
  };

  // Don't show if already installed or dismissed
  if (isAppInstalled || dismissed) return null;

  return (
    <>
      {/* Trigger button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start gap-2 text-xs bg-sidebar-accent/30 border-sidebar-border hover:bg-sidebar-accent/50"
        onClick={() => setShowDialog(true)}
      >
        {isIOS ? (
          <Apple className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
        ) : (
          <Smartphone className="w-3.5 h-3.5 text-green-500" />
        )}
        Installer l&apos;application
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-6 text-white">
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 text-white/70 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-md">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Installer GradeUp</h3>
                <p className="text-sm text-blue-100">Accédez rapidement depuis votre écran d&apos;accueil</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-blue-100">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Notifications push même hors ligne</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-blue-100 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Accès rapide et mode plein écran</span>
            </div>
          </div>

          <div className="p-6">
            {isIOS ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Sur iPhone/iPad, Safari ne permet pas l&apos;installation automatique. Suivez ces étapes :
                </p>
                <ol className="space-y-3 text-sm">
                  <li className="flex items-start gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0 mt-0.5">1</span>
                    <span>Ouvrez cette page dans <strong>Safari</strong></span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0 mt-0.5">2</span>
                    <div className="flex items-center gap-2">
                      <span>Appuyez sur l&apos;icône <strong>Partager</strong></span>
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 border">
                        <Share className="w-4 h-4 text-blue-600" />
                      </span>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0 mt-0.5">3</span>
                    <div className="flex items-center gap-2">
                      <span>Sélectionnez <strong>&quot;Sur l&apos;écran d&apos;accueil&quot;</strong></span>
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 border">
                        <Plus className="w-4 h-4 text-blue-600" />
                      </span>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0 mt-0.5">4</span>
                    <span>Confirmez en appuyant sur <strong>&quot;Ajouter&quot;</strong></span>
                  </li>
                </ol>
                <Button onClick={handleDismiss} className="w-full" size="lg">
                  J&apos;ai compris
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {installStep === 'done' ? (
                  <div className="text-center py-4">
                    <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="text-sm font-medium">GradeUp a été installé !</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Installez GradeUp sur votre appareil pour un accès rapide et des notifications push.
                    </p>
                    <Button
                      onClick={handleInstall}
                      disabled={installStep === 'installing'}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                      size="lg"
                    >
                      {installStep === 'installing' ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Installation en cours...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Installer maintenant
                        </>
                      )}
                    </Button>
                    {!isInstallable && (
                      <div className="text-xs text-muted-foreground space-y-2 mt-3 p-3 rounded-lg bg-muted/50">
                        <p className="font-medium">Si le bouton ne fonctionne pas :</p>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>Ouvrez le menu de votre navigateur (3 points)</li>
                          <li>Cliquez sur &quot;Installer l&apos;application&quot; ou &quot;Ajouter à l&apos;écran d&apos;accueil&quot;</li>
                        </ol>
                      </div>
                    )}
                  </>
                )}
                <Button onClick={handleDismiss} variant="ghost" className="w-full" size="sm">
                  Plus tard
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
