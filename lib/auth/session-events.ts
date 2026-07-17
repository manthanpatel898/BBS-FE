export const AUTH_SESSION_EXPIRED_EVENT = 'banquate:auth-session-expired';

export function isSessionInvalidatingResponse(status: number, message: string) {
  if (status === 401) return true;
  if (status !== 403) return false;
  const normalizedMessage = message.toLowerCase();
  return (
    normalizedMessage.includes('account is inactive') ||
    normalizedMessage.includes('restaurant not found') ||
    normalizedMessage.includes('restaurant has been deactivated') ||
    normalizedMessage.includes('restaurant subscription has expired') ||
    normalizedMessage.includes('subscription has expired')
  );
}

export function notifySessionExpired() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
}
