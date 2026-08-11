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

  it('redirige a /login una ruta protegida sin sesión', () => {
    const response = middleware(buildRequest('/dashboard/documents/doc-1'));

    expect(response.headers.get('location')).toBe(
      'http://localhost:3001/login',
    );
  });

  it('mantiene el redirect 308 de las rutas heredadas del dashboard', () => {
    const response = middleware(buildRequest('/documents/doc-1', 'jwt'));

    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3001/dashboard/documents/doc-1',
    );
  });
});
