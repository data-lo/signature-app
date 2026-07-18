import Cookies from 'js-cookie';

export const TOKEN_COOKIE_NAME = 'token';

export function setAuthToken(token: string): void {
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  Cookies.set(TOKEN_COOKIE_NAME, token, {
    expires: 1,
    sameSite: 'lax',
    secure: isSecure,
  });
}

export function getAuthToken(): string | undefined {
  return Cookies.get(TOKEN_COOKIE_NAME);
}

export function clearAuthToken(): void {
  Cookies.remove(TOKEN_COOKIE_NAME);
}
