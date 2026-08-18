export function resolvePasswordResetToken(
  searchParamToken: string | null | undefined,
  browserHref: string,
): string {
  const hydratedToken = searchParamToken?.trim() ?? '';
  if (hydratedToken) return hydratedToken;

  if (!browserHref) return '';

  try {
    return new URL(browserHref).searchParams.get('token')?.trim() ?? '';
  } catch {
    return '';
  }
}
