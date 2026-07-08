import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function isTokenExpired(token: string): boolean {
  const payloadSegment = token.split('.')[1];
  if (!payloadSegment) return true;

  try {
    const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64)) as { exp?: number };
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
  matcher: [
    '/((?!login|signup|documents|error|_next/static|_next/image|favicon.ico).*)',
    '/documents/create',
    '/documents/create/:path*',
  ],
};
