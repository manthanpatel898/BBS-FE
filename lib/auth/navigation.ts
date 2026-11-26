import { canAccessEventExpenses } from './event-expenses-addon';
import { AuthUser } from './types';
import {
  EVENT_DECORATION_MODULE_ENABLED,
  getBusinessHomeRoute,
  getDecorationHomeRoute,
} from './business-routes';

export function getHomeRouteForUser(user: AuthUser | null) {
  if (!user) {
    return '/login';
  }

  if (
    EVENT_DECORATION_MODULE_ENABLED &&
    user.businessType === 'EVENT_DECORATION' &&
    user.role === 'employee'
  ) {
    return getDecorationHomeRoute((user.effectivePermissions ?? []).filter((permission) => canAccessEventExpenses(user) || !['decoration.expenses.', 'decoration.expense_types.', 'decoration.accounts.'].some((prefix) => permission.startsWith(prefix))));
  }
  return getBusinessHomeRoute(user.businessType);
}
