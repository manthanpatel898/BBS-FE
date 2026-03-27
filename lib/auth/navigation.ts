import { AuthUser } from './types';

export function getHomeRouteForUser(user: AuthUser | null) {
  if (!user) {
    return '/login';
  }

  return '/dashboard';
}
