export const AUTH_SESSION_EXPIRED_EVENT = 'banquate:auth-session-expired';

export function notifySessionExpired() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
}
