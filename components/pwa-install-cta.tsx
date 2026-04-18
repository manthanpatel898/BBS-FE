'use client';

import { usePwa } from '@/components/pwa-bootstrap';

export function PwaInstallCta({ className = '' }: { className?: string }) {
  const { canInstall, isInstalled, installLabel, requestInstall } = usePwa();

  if (isInstalled) {
    return (
      <span className={className}>
        <svg viewBox="0 0 20 20" fill="currentColor" className="mr-1.5 inline h-4 w-4 text-emerald-500">
          <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
        </svg>
        Added to Home Screen
      </span>
    );
  }

  if (!canInstall) return null;

  return (
    <button
      type="button"
      onClick={() => { void requestInstall(); }}
      className={className}
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="mr-1.5 inline h-4 w-4">
        <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
        <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
      </svg>
      {installLabel}
    </button>
  );
}
