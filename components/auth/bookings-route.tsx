'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getHomeRouteForUser } from '@/lib/auth/navigation';
import { useAuth } from './auth-provider';

export function BookingsRoute({ children }: { children: React.ReactNode }) {
  const { isReady, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isReady || !user) {
      return;
    }

    if (!['company_admin', 'employee'].includes(user.role)) {
      router.replace(getHomeRouteForUser(user));
    }
  }, [isReady, router, user]);

  if (!isReady || !user) {
    return null;
  }

  if (!['company_admin', 'employee'].includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
