import { AuthSession } from './types';

const STORAGE_KEY = 'banquate_auth_session';
const COOKIE_KEY  = 'banquate_auth_token';

/** 7 days in milliseconds — must match JWT_EXPIRES_IN on the API */
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** 7 days in seconds for the cookie max-age */
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

interface StoredSession {
  session: AuthSession;
  savedAt: number; // Unix timestamp (ms)
}

export function saveSession(session: AuthSession) {
  if (typeof window === 'undefined') return;

  const stored: StoredSession = { session, savedAt: Date.now() };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

  document.cookie = [
    `${COOKIE_KEY}=${session.accessToken}`,
    'path=/',
    `max-age=${COOKIE_MAX_AGE}`,
    'samesite=lax',
  ].join('; ');
}

export function readSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const stored = JSON.parse(raw) as StoredSession;

    // Support sessions saved before the StoredSession wrapper was introduced
    // (they won't have a `savedAt` field — treat them as expired to force re-login)
    if (!stored.savedAt || !stored.session) {
      clearSession();
      return null;
    }

    // Enforce 7-day client-side expiry even if the JWT itself is still valid
    if (Date.now() - stored.savedAt > SESSION_TTL_MS) {
      clearSession();
      return null;
    }

    return stored.session;
  } catch {
    clearSession();
    return null;
  }
}

export function clearSession() {
  if (typeof window === 'undefined') return;

  window.localStorage.removeItem(STORAGE_KEY);
  document.cookie = `${COOKIE_KEY}=; path=/; max-age=0; samesite=lax`;
}
