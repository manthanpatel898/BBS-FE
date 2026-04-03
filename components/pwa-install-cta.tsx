'use client';

import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function isIos() {
  if (typeof window === 'undefined') {
    return false;
  }

  return /iPad|iPhone|iPod/.test(window.navigator.userAgent);
}

function isAndroid() {
  if (typeof window === 'undefined') {
    return false;
  }

  return /Android/i.test(window.navigator.userAgent);
}

function isStandalone() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia('(display-mode: standalone)').matches;
}

export function PwaInstallCta({ className = '' }: { className?: string }) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);
  const [showAndroidHint, setShowAndroidHint] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    setIsInstalled(isStandalone());
    setShowIosHint(isIos() && !isStandalone());
    setShowAndroidHint(isAndroid() && !isStandalone());

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setIsInstalled(true);
      setInstallPrompt(null);
      setShowIosHint(false);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (isInstalled) {
    return (
      <span className={className}>
        Added to Home Screen
      </span>
    );
  }

  if (installPrompt) {
    return (
      <button
        type="button"
        onClick={async () => {
          await installPrompt.prompt();
          await installPrompt.userChoice;
          setInstallPrompt(null);
        }}
        className={className}
      >
        Add bbs to Home Screen
      </button>
    );
  }

  if (showIosHint) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowHelp((current) => !current)}
          className={className}
        >
          Add bbs to Home Screen
        </button>
        {showHelp ? (
          <div className="max-w-[360px] rounded-3xl border border-blue-100 bg-white/90 p-4 text-left text-sm text-slate-600 shadow-[0_12px_30px_rgba(148,163,184,0.12)]">
            <p className="font-semibold text-slate-900">Install on iPhone</p>
            <p className="mt-2">1. Open this site in Safari.</p>
            <p className="mt-1">2. Tap the Share button.</p>
            <p className="mt-1">3. Tap <span className="font-semibold text-slate-900">Add to Home Screen</span>.</p>
          </div>
        ) : null}
      </div>
    );
  }

  if (showAndroidHint) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowHelp((current) => !current)}
          className={className}
        >
          Add bbs to Home Screen
        </button>
        {showHelp ? (
          <div className="max-w-[360px] rounded-3xl border border-blue-100 bg-white/90 p-4 text-left text-sm text-slate-600 shadow-[0_12px_30px_rgba(148,163,184,0.12)]">
            <p className="font-semibold text-slate-900">Install on Android</p>
            <p className="mt-2">1. Open this site in Chrome.</p>
            <p className="mt-1">2. Tap the browser menu.</p>
            <p className="mt-1">3. Choose <span className="font-semibold text-slate-900">Install app</span> or <span className="font-semibold text-slate-900">Add to Home screen</span>.</p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setShowHelp((current) => !current)}
        className={className}
      >
        Download PWA
      </button>
      {showHelp ? (
        <div className="max-w-[420px] rounded-3xl border border-blue-100 bg-white/90 p-4 text-left text-sm text-slate-600 shadow-[0_12px_30px_rgba(148,163,184,0.12)]">
          <p className="font-semibold text-slate-900">Install bbs on mobile</p>
          <p className="mt-2">Android: open the site in Chrome and choose <span className="font-semibold text-slate-900">Install app</span> or <span className="font-semibold text-slate-900">Add to Home screen</span>.</p>
          <p className="mt-2">iPhone: open the site in Safari, tap Share, then choose <span className="font-semibold text-slate-900">Add to Home Screen</span>.</p>
        </div>
      ) : null}
    </div>
  );
}
