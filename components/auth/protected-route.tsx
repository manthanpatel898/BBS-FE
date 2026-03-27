'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getHomeRouteForUser } from '@/lib/auth/navigation';
import { useAuth } from './auth-provider';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isReady, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!user) {
      router.replace('/login');
      return;
    }

    if (user.isFirstLogin && pathname !== '/reset-password') {
      router.replace('/reset-password');
      return;
    }

    if (!user.isFirstLogin && pathname === '/reset-password') {
      router.replace(getHomeRouteForUser(user));
    }
  }, [isReady, pathname, router, user]);

  if (!isReady) {
    return <div className="text-sm text-stone-400">Loading session...</div>;
  }

  if (!user) {
    return null;
  }

  if (user.isFirstLogin && pathname !== '/reset-password') {
    return null;
  }

  if (!user.isFirstLogin && pathname === '/reset-password') {
    return null;
  }

  return <>{children}</>;
}
