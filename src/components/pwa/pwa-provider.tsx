'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, WifiOff, X } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export function PwaProvider() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [dismissedInstall, setDismissedInstall] = useState(false);
  const [dismissedOffline, setDismissedOffline] = useState(false);

  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);

    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((error) => {
          console.error('Service worker registration failed', error);
        });
      });
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setDismissedInstall(false);
    };

    const handleOnline = () => {
      setIsOnline(true);
      setDismissedOffline(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const canInstall = useMemo(() => !!deferredPrompt && !dismissedInstall, [deferredPrompt, dismissedInstall]);
  const showOfflineBanner = !isOnline && !dismissedOffline;

  const onInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setDismissedInstall(true);
  };

  return (
    <>
      {showOfflineBanner ? (
        <div className="fixed inset-x-3 top-3 z-50 mx-auto max-w-md rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-lg sm:max-w-lg md:max-w-xl">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl bg-amber-100 p-2 text-amber-700">
              <WifiOff className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-900">You are offline</p>
              <p className="mt-1 text-xs text-amber-800">Saved pages can still open, but new uploads and live data sync will wait until your signal returns.</p>
            </div>
            <button
              type="button"
              aria-label="Dismiss offline message"
              onClick={() => setDismissedOffline(true)}
              className="rounded-xl p-1 text-amber-700 hover:bg-amber-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      {canInstall ? (
        <div className="fixed inset-x-3 bottom-24 z-40 mx-auto max-w-md rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-[0_18px_48px_rgba(15,23,42,0.18)] backdrop-blur sm:max-w-lg md:max-w-xl">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-slate-900 p-2 text-white">
              <Download className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">Install Rapid Wrench</p>
              <p className="mt-1 text-xs text-slate-600">Add the app to your phone home screen for faster launch and a more app-like field workflow.</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={onInstall}
                  className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition active:scale-[0.98]"
                >
                  Install
                </button>
                <button
                  type="button"
                  onClick={() => setDismissedInstall(true)}
                  className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition active:scale-[0.98]"
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
