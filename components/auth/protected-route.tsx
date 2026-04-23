'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getHomeRouteForUser } from '@/lib/auth/navigation';
import { useAuth } from './auth-provider';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isReady, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const normalizedPathname =
    pathname && pathname !== '/' ? pathname.replace(/\/+$/, '') : pathname;
  const isResetPasswordRoute = normalizedPathname === '/reset-password';

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!user) {
      router.replace('/login');
      return;
    }

    if (user.isFirstLogin && !isResetPasswordRoute) {
      router.replace('/reset-password');
      return;
    }

    if (!user.isFirstLogin && isResetPasswordRoute) {
      router.replace(getHomeRouteForUser(user));
    }
  }, [isReady, isResetPasswordRoute, router, user]);

  if (!isReady) {
    return <div className="text-sm text-stone-400">Loading session...</div>;
  }

  if (!user) {
    return null;
  }

  if (user.isFirstLogin && !isResetPasswordRoute) {
    return null;
  }

  if (!user.isFirstLogin && isResetPasswordRoute) {
    return null;
  }

  return <>{children}</>;
}
