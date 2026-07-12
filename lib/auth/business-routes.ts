import type { BusinessType } from './types';

const DECORATION_PREFIX = '/decoration';
const SHARED_PREFIXES = ['/employees', '/audit-logs', '/reset-password', '/access-denied'];
const BANQUET_PREFIXES = [
  '/dashboard',
  '/bookings',
  '/followups',
  '/cancelled-bookings',
  '/categories',
  '/menus',
  '/settings',
  '/hot-dates',
  '/reports',
  '/customer-wallet',
  '/vouchers',
  '/menu-selection',
  '/odc',
];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function getBusinessHomeRoute(businessType?: BusinessType | null): string {
  return businessType === 'EVENT_DECORATION'
    ? '/decoration/dashboard'
    : '/dashboard';
}

export function isRouteAllowedForBusiness(
  pathname: string,
  businessType?: BusinessType | null,
): boolean {
  if (SHARED_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))) return true;
  if (businessType === 'EVENT_DECORATION') {
    return matchesPrefix(pathname, DECORATION_PREFIX);
  }
  if (matchesPrefix(pathname, DECORATION_PREFIX)) return false;
  return BANQUET_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

const DECORATION_ROUTE_PERMISSIONS: Array<[string, string]> = [
  ['/decoration/dashboard', 'decoration.view'],
  ['/decoration/events', 'decoration.bookings.view'],
  ['/decoration/followups', 'decoration.followups.manage'],
  ['/decoration/reports', 'decoration.reports.view'],
  ['/decoration/catalog', 'decoration.catalog.view'],
];

export function getDecorationRoutePermission(pathname: string): string | null {
  return (
    DECORATION_ROUTE_PERMISSIONS.find(([prefix]) =>
      matchesPrefix(pathname, prefix),
    )?.[1] ?? null
  );
}

export function getDecorationHomeRoute(permissions: string[] = []): string {
  const preferredRoutes = DECORATION_ROUTE_PERMISSIONS.filter(([route]) =>
    ['/decoration/dashboard', '/decoration/events', '/decoration/followups'].includes(route),
  );
  return (
    preferredRoutes.find(([, permission]) => permissions.includes(permission))?.[0] ??
    '/access-denied'
  );
}
