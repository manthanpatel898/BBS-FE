import { AuthUser } from './types';

export const PERMISSIONS = {
  EMPLOYEES_PERMISSIONS_VIEW: 'employees.permissions.view',
  EMPLOYEES_PERMISSIONS_MANAGE: 'employees.permissions.manage',
} as const;

export function hasPermission(user: AuthUser | null | undefined, permission: string) {
  return Boolean(user?.effectivePermissions?.includes(permission));
}
