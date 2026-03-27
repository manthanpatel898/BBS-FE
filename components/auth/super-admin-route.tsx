'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getHomeRouteForUser } from '@/lib/auth/navigation';
import { useAuth } from './auth-provider';

export function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { isReady, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isReady || !user) {
      return;
    }

    if (user.role !== 'super_admin') {
      router.replace(getHomeRouteForUser(user));
    }
  }, [isReady, router, user]);

  if (!isReady || !user) {
    return null;
  }

  if (user.role !== 'super_admin') {
    return null;
  }

  return <>{children}</>;
}
