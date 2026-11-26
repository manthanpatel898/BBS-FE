import type { AuthUser } from './types';
export function canAccessEventExpenses(user?: Pick<AuthUser, 'businessType' | 'canAccessEventExpenses'> | null): boolean {
  return user?.businessType === 'EVENT_DECORATION' && user.canAccessEventExpenses === true;
}
export function isEventExpenseRoute(pathname: string): boolean {
  return ['/decoration/reports/expenses', '/decoration/reports/accounts'].some((route) => pathname === route || pathname.startsWith(`${route}/`));
}
