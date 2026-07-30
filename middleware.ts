import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// '/signup/verify' es pública: un usuario recién registrado (Caso A o pre-cuenta nueva, ver
// historia "Auth: Flujo de Pre-registro, Verificación OTP y Control por CURP") todavía no tiene
// token — si no estuviera aquí, el middleware la trataría como ruta protegida y lo rebotaría a
// /login antes de poder verificar su OTP.
const AUTH_ROUTES = ['/login', '/signup', '/signup/verify'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;

  if (AUTH_ROUTES.includes(pathname)) {
    if (token) {
      return NextResponse.redirect(new URL('/home', request.url));
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
