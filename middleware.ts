import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_ROUTES = ['/login', '/signup', '/forgot-password', '/signup/verify'];

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
    // Historia "Visualización pública de documentos firmados mediante MinIO": /public/* no debe
    // pasar por este middleware en absoluto (ni el chequeo de token, ni ninguna redirección) —
    // se excluye del matcher, igual que api/_next/estáticos, en vez de agregar un `if` dentro de
    // la función, para que quede claro que esta ruta nunca depende de sesión.
    '/((?!api|_next/static|_next/image|favicon.ico|brand/|public/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
