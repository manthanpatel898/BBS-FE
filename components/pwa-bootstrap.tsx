'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';

/* ─── Types ───────────────────────────────────────────── */

type Platform = 'ios' | 'android' | 'desktop' | 'unknown';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

interface PwaContextValue {
  canInstall: boolean;
  isInstalled: boolean;
  installLabel: string;
  showIosHint: boolean;
  updateReady: boolean;
  requestInstall: () => Promise<void>;
  dismissIosHint: () => void;
}

/* ─── Constants ───────────────────────────────────────── */

const AUTO_PROMPT_MIN_VISITS = 3;
const AUTO_PROMPT_MIN_AGE_MS = 24 * 60 * 60 * 1000; // 24 h
const ANDROID_SNOOZE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const SK = {
  visits:       'pwa_visit_count',
  firstVisit:   'pwa_first_visit',
  snoozedUntil: 'pwa_snoozed_until',
  installed:    'pwa_installed',
} as const;

// Paths that don't count as "qualified" visits for auto-prompt
const EXCLUDED_PATHS = ['/', '/offline'];
const EXCLUDED_PREFIXES = ['/auth'];

/* ─── Helpers ─────────────────────────────────────────── */

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true)
  );
}

function isQualifiedPath(path: string): boolean {
  if (EXCLUDED_PATHS.includes(path)) return false;
  if (EXCLUDED_PREFIXES.some((p) => path.startsWith(p))) return false;
  return true;
}

function storageGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function storageSet(key: string, val: string): void {
  try { localStorage.setItem(key, val); } catch { /* ignore */ }
}

/* ─── Context ─────────────────────────────────────────── */

const PwaCtx = createContext<PwaContextValue>({
  canInstall: false,
  isInstalled: false,
  installLabel: 'Add to Home Screen',
  showIosHint: false,
  updateReady: false,
  requestInstall: async () => {},
  dismissIosHint: () => {},
});

export function usePwa() {
  return useContext(PwaCtx);
}

/* ─── Provider ────────────────────────────────────────── */

export function PwaBootstrap({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const [platform, setPlatform]         = useState<Platform>('unknown');
  const [installed, setInstalled]       = useState(false);
  const [deferredPrompt, setDeferred]   = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint]   = useState(false);
  const [updateReady, setUpdateReady]   = useState(false);

  const autoPromptFired = useRef(false);

  /* ── Detect platform + installed state ── */
  useEffect(() => {
    const p = detectPlatform();
    setPlatform(p);

    if (isStandalone() || storageGet(SK.installed) === '1') {
      setInstalled(true);
    }
  }, []);

  /* ── Capture beforeinstallprompt (also picks up pre-hydration capture) ── */
  useEffect(() => {
    // Pick up event captured before React hydrated (set by inline script in layout)
    if ((window as Window & { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt) {
      setDeferred((window as Window & { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt!);
    }

    function onPrompt(e: Event) {
      e.preventDefault();
      const evt = e as BeforeInstallPromptEvent;
      (window as Window & { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt = evt;
      setDeferred(evt);
    }

    function onInstalled() {
      setInstalled(true);
      setDeferred(null);
      storageSet(SK.installed, '1');
    }

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  /* ── Register service worker + watch for updates ── */
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    navigator.serviceWorker.register('/sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const next = reg.installing;
        if (!next) return;
        next.addEventListener('statechange', () => {
          if (next.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateReady(true);
          }
        });
      });
    });
  }, []);

  /* ── Track qualified visits + auto-prompt ── */
  useEffect(() => {
    if (installed || autoPromptFired.current) return;
    if (!isQualifiedPath(pathname)) return;

    const now = Date.now();

    // First visit timestamp
    if (!storageGet(SK.firstVisit)) {
      storageSet(SK.firstVisit, String(now));
    }

    // Increment visit count
    const prev = parseInt(storageGet(SK.visits) ?? '0', 10);
    storageSet(SK.visits, String(prev + 1));

    const visits = prev + 1;
    const firstVisit = parseInt(storageGet(SK.firstVisit) ?? String(now), 10);
    const ageMs = now - firstVisit;
    const snoozedUntil = parseInt(storageGet(SK.snoozedUntil) ?? '0', 10);

    const eligible =
      visits >= AUTO_PROMPT_MIN_VISITS &&
      ageMs >= AUTO_PROMPT_MIN_AGE_MS &&
      now > snoozedUntil;

    if (!eligible) return;

    autoPromptFired.current = true;

    // Android: fire native prompt
    if (deferredPrompt) {
      deferredPrompt.prompt().then(() =>
        deferredPrompt.userChoice.then(({ outcome }) => {
          if (outcome === 'accepted') {
            setInstalled(true);
            storageSet(SK.installed, '1');
          } else {
            storageSet(SK.snoozedUntil, String(now + ANDROID_SNOOZE_MS));
          }
          setDeferred(null);
        })
      );
    }

    // iOS: show hint banner
    if (platform === 'ios') {
      setShowIosHint(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  /* ── requestInstall (called from UI button) ── */
  const requestInstall = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstalled(true);
        storageSet(SK.installed, '1');
      } else {
        storageSet(SK.snoozedUntil, String(Date.now() + ANDROID_SNOOZE_MS));
      }
      setDeferred(null);
      (window as Window & { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt = undefined;
      return;
    }

    if (platform === 'ios') {
      setShowIosHint(true);
    }
  }, [deferredPrompt, platform]);

  const dismissIosHint = useCallback(() => setShowIosHint(false), []);

  const canInstall = !installed && (platform === 'ios' || Boolean(deferredPrompt));
  const installLabel = platform === 'ios' ? 'Add to Home Screen' : 'Install app';

  return (
    <PwaCtx.Provider value={{ canInstall, isInstalled: installed, installLabel, showIosHint, updateReady, requestInstall, dismissIosHint }}>
      {children}

      {/* iOS instruction banner */}
      {showIosHint && (
        <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_16px_48px_rgba(0,0,0,0.14)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Add to Home Screen</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Tap the{' '}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="inline h-3.5 w-3.5 align-text-bottom">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m0-3-3-3m0 0-3 3m3-3V15" />
                </svg>{' '}
                <span className="font-medium text-slate-700">Share</span> button in Safari, then choose{' '}
                <span className="font-medium text-slate-700">Add to Home Screen</span>.
              </p>
            </div>
            <button
              type="button"
              onClick={dismissIosHint}
              className="shrink-0 rounded-full p-1 text-slate-400 hover:text-slate-600"
              aria-label="Dismiss"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Update ready banner */}
      {updateReady && (
        <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.10)]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-amber-900">A new version is available.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="shrink-0 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-amber-600"
            >
              Reload
            </button>
          </div>
        </div>
      )}
    </PwaCtx.Provider>
  );
}
