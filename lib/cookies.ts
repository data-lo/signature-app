import Cookies from 'js-cookie';

export const TOKEN_COOKIE_NAME = 'token';

/**
 * Lee `exp` directamente del JWT en vez de asumir una duración fija — si
 * `JWT_EXPIRES_IN` cambia en el backend, la cookie deja de desincronizarse
 * de la vigencia real del token (la cookie sobreviviendo a un token ya
 * expirado, o viceversa, es justo lo que produce un /home -> /login
 * inesperado bastante tiempo después de iniciar sesión).
 */
function getTokenExpiry(token: string): Date | null {
  try {
    const payloadSegment = token.split('.')[1];
    if (!payloadSegment) return null;
    const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      '=',
    );
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    return typeof payload.exp === 'number' ? new Date(payload.exp * 1000) : null;
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  Cookies.set(TOKEN_COOKIE_NAME, token, {
    expires: getTokenExpiry(token) ?? 1,
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
