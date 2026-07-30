import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_ROUTES = ['/login', '/signup', '/forgot-password', '/signup/verify'];

// El dashboard vivía en la raíz (/home, /documents, /organization, /personal-documents, /plans)
// antes de moverlo bajo /dashboard. Cualquier link/bookmark viejo a una de estas rutas se
// redirige permanentemente (308) a su equivalente bajo /dashboard — la protección de auth no se
// duplica aquí, corre de nuevo normalmente en la request de destino tras el redirect.
const LEGACY_DASHBOARD_PREFIXES = [
  '/home',
  '/documents',
  '/organization',
  '/personal-documents',
  '/plans',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;

  const legacyPrefix = LEGACY_DASHBOARD_PREFIXES.find(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (legacyPrefix) {
    const url = request.nextUrl.clone();
    url.pathname = `/dashboard${pathname}`;
    return NextResponse.redirect(url, 308);
  }

  if (AUTH_ROUTES.includes(pathname)) {
    if (token) {
      return NextResponse.redirect(new URL('/dashboard/home', request.url));
    }
    return NextResponse.next();
  }

  if (pathname === '/') {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
