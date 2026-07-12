import { AuthUser } from './types';
import { getBusinessHomeRoute, getDecorationHomeRoute } from './business-routes';

export function getHomeRouteForUser(user: AuthUser | null) {
  if (!user) {
    return '/login';
  }

  if (user.businessType === 'EVENT_DECORATION' && user.role === 'employee') {
    return getDecorationHomeRoute(user.effectivePermissions);
  }
  return getBusinessHomeRoute(user.businessType);
}
