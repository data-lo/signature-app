import Cookies from 'js-cookie';

export const TOKEN_COOKIE_NAME = 'token';

export function setAuthToken(token: string): void {
  Cookies.set(TOKEN_COOKIE_NAME, token, {
    expires: 1,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

export function getAuthToken(): string | undefined {
  return Cookies.get(TOKEN_COOKIE_NAME);
}

export function clearAuthToken(): void {
  Cookies.remove(TOKEN_COOKIE_NAME);
}
