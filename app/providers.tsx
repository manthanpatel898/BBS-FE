'use client';

import { AuthProvider } from '@/components/auth/auth-provider';
import { ToastProvider } from '@/components/ui/toast';
import { PwaBootstrap } from '@/components/pwa-bootstrap';
import { usePathname } from 'next/navigation';

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Isolated, data-free PDF rendering surface: no auth, service worker or PWA overlays.
  if (pathname?.replace(/\/$/, '') === '/print/whatsapp') return <>{children}</>;
  return (
    <PwaBootstrap>
      <ToastProvider>
        <AuthProvider>{children}</AuthProvider>
      </ToastProvider>
    </PwaBootstrap>
  );
}
