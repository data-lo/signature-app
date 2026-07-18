import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function isTokenExpired(token: string): boolean {
  const payloadSegment = token.split('.')[1];
  if (!payloadSegment) return true;

  try {
    const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    // atob() en algunos runtimes rechaza base64 sin el padding '=' que
    // JWT (base64url) omite por diseño — se restaura antes de decodificar
    // para no marcar un token válido como expirado por esto.
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      '=',
    );
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    if (typeof payload.exp !== 'number') return true;
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/') {
    return NextResponse.next();
  }

  const token = request.cookies.get('token')?.value;

  if (!token || isTokenExpired(token)) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('token');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|login|signup|error|_next/static|_next/image|favicon.ico).*)'],
};
