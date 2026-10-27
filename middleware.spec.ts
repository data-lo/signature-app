/**
 * @jest-environment node
 *
 * El middleware corre en el edge runtime, no en el navegador: `NextRequest` necesita los
 * globales web (`Request`, `Headers`) que jsdom no expone, por eso esta suite usa el entorno
 * node en vez del jsdom por defecto del proyecto.
 */
import { NextRequest } from 'next/server';
import { middleware } from './middleware';

function buildRequest(path: string, token?: string): NextRequest {
  const request = new NextRequest(new URL(`http://localhost:3001${path}`));
  if (token) {
    request.cookies.set('token', token);
  }
  return request;
}

describe('middleware', () => {
  describe('/access-document (enlace de firma enviado por correo)', () => {
    // Regresión: este enlace llega desde un correo, así que lo normal es abrirlo SIN sesión. Si
    // el middleware lo desvía a /login, la página nunca renderiza y nunca guarda el contexto de
    // firma pendiente — el usuario termina en /dashboard/documents/create tras iniciar sesión y
    // el documento que venía a firmar se pierde.
    it('deja pasar la petición sin sesión en vez de mandar a /login', () => {
      const response = middleware(
        buildRequest('/access-document?docId=doc-1&collabId=collab-1'),
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
    });

    it('deja pasar también con sesión activa, para que la página vincule al colaborador', () => {
      const response = middleware(
        buildRequest('/access-document?docId=doc-1&collabId=collab-1', 'jwt'),
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
    });
  });

  describe('/sign/:token (invitación individual de firma)', () => {
    const TOKEN = 'q3VbX7f0_Lr9-ZtKp2NcWm4YhA8sDe1JuGo6BiQk5Rv';

    it('deja pasar sin sesión: firmar no requiere login', () => {
      const response = middleware(buildRequest(`/sign/${TOKEN}`));

      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
    });

    it('deja pasar también con sesión activa', () => {
      const response = middleware(buildRequest(`/sign/${TOKEN}`, 'jwt'));

      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
    });

    it('sólo el prefijo /sign/: /signup sigue su propia regla', () => {
      const response = middleware(buildRequest('/signupx'));

      expect(response.headers.get('location')).toContain('/login');
    });
  });

  it('redirige a /login una ruta protegida sin sesión, recordando la ruta pedida', () => {
    const response = middleware(buildRequest('/dashboard/documents/doc-1'));

    expect(response.headers.get('location')).toBe(
      'http://localhost:3001/login?returnTo=%2Fdashboard%2Fdocuments%2Fdoc-1',
    );
  });

  it('la ruta recordada conserva su query (filtros, pestañas)', () => {
    const response = middleware(
      buildRequest('/dashboard/documents?view=pending&q=contrato'),
    );

    expect(response.headers.get('location')).toBe(
      'http://localhost:3001/login?returnTo=%2Fdashboard%2Fdocuments%3Fview%3Dpending%26q%3Dcontrato',
    );
  });

  it('desde la raíz sin sesión manda a /login a secas', () => {
    const response = middleware(buildRequest('/'));

    expect(response.headers.get('location')).toBe(
      'http://localhost:3001/login',
    );
  });

  describe('pantallas de autenticación con sesión activa', () => {
    it('sin ruta previa, manda al dashboard de documentos y no a la creación', () => {
      const response = middleware(buildRequest('/login', 'jwt'));

      expect(response.headers.get('location')).toBe(
        'http://localhost:3001/dashboard/documents',
      );
    });

    it('con ruta previa, manda a la ruta originalmente solicitada', () => {
      const response = middleware(
        buildRequest('/login?returnTo=%2Fdashboard%2Fplans', 'jwt'),
      );

      expect(response.headers.get('location')).toBe(
        'http://localhost:3001/dashboard/plans',
      );
    });

    it('ignora una ruta previa externa', () => {
      const response = middleware(
        buildRequest('/login?returnTo=%2F%2Fevil.com', 'jwt'),
      );

      expect(response.headers.get('location')).toBe(
        'http://localhost:3001/dashboard/documents',
      );
    });

    it('sin sesión, deja ver el login', () => {
      const response = middleware(
        buildRequest('/login?returnTo=%2Fdashboard%2Fplans'),
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
    });
  });

  it('mantiene el redirect 308 de las rutas heredadas del dashboard', () => {
    const response = middleware(buildRequest('/documents/doc-1', 'jwt'));

    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3001/dashboard/documents/doc-1',
    );
  });
});
