const TOKEN_KEY = 'feedbackInvitationToken';

export function captureFeedbackToken(searchParams: URLSearchParams): string | null {
  if (typeof window === 'undefined') return null;
  const queryToken = searchParams.get('token')?.trim() || null;
  if (queryToken) sessionStorage.setItem(TOKEN_KEY, queryToken);

  if (searchParams.has('token')) {
    const clean = new URL(window.location.href);
    clean.searchParams.delete('token');
    window.history.replaceState({}, '', `${clean.pathname}${clean.search}${clean.hash}`);
  }
  return queryToken ?? getFeedbackToken();
}

export function getFeedbackToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export function clearFeedbackToken(): void {
  if (typeof window !== 'undefined') sessionStorage.removeItem(TOKEN_KEY);
}

