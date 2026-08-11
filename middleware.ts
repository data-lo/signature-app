import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_ROUTES = ['/login', '/signup', '/forgot-password', '/signup/verify'];

// Punto de entrada de los enlaces de correo para firmar (ver historia "Notificación por Email
// para Firma Simple y Vinculación de Cuenta"). NO puede pasar por el guard de sesión: el
// destinatario abre el correo casi siempre sin sesión iniciada, y si el middleware lo manda a
// /login antes de renderizar la página, `setPendingSignatureContext` nunca corre y se pierde
// para siempre qué documento venía a firmar (termina en /dashboard/documents/create tras el
// login). La propia página decide a dónde va: a /login si no hay token — guardando antes el
// contexto, que /login consume para devolverlo al documento — o directo al documento si ya hay
// sesión. Tampoco va en AUTH_ROUTES, porque ahí un usuario con sesión sería desviado al
// dashboard y se saltaría la vinculación del colaborador.
const PUBLIC_ROUTES = ['/access-document'];

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

  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  if (AUTH_ROUTES.includes(pathname)) {
    if (token) {
      return NextResponse.redirect(
        new URL('/dashboard/documents/create', request.url),
      );
    }
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
    '/((?!api|_next/static|_next/image|favicon.ico|public/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
