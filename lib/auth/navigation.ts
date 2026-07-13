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
    return getDecorationHomeRoute(user.effectivePermissions);
  }
  return getBusinessHomeRoute(user.businessType);
}
