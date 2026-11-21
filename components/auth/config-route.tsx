'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getHomeRouteForUser } from '@/lib/auth/navigation';
import { useAuth } from './auth-provider';
import { hasPermission } from '@/lib/auth/permissions';

export function ConfigRoute({ children, requiredPermission }: { children: React.ReactNode; requiredPermission?: string }) {
  const { isReady, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isReady || !user) {
      return;
    }

    if (user.role !== 'super_admin' && user.role !== 'company_admin' && (!requiredPermission || !hasPermission(user, requiredPermission))) {
      router.replace(getHomeRouteForUser(user));
    }
  }, [isReady, router, user]);

  if (!isReady || !user) {
    return null;
  }

  if (user.role !== 'super_admin' && user.role !== 'company_admin' && (!requiredPermission || !hasPermission(user, requiredPermission))) {
    return null;
  }

  return <>{children}</>;
}
