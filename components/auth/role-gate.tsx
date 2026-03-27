'use client';

import { UserRole } from '@/lib/auth/types';
import { useAuth } from './auth-provider';

export function RoleGate({
  roles,
  children,
}: {
  roles: UserRole[];
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
