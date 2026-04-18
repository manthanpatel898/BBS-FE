'use client';

import { AuthProvider } from '@/components/auth/auth-provider';
import { ToastProvider } from '@/components/ui/toast';
import { PwaBootstrap } from '@/components/pwa-bootstrap';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PwaBootstrap>
      <ToastProvider>
        <AuthProvider>{children}</AuthProvider>
      </ToastProvider>
    </PwaBootstrap>
  );
}
