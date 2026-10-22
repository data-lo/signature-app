import {
  DEFAULT_AUTHENTICATED_ROUTE,
  buildLoginPath,
  resolvePostLoginDestination,
  sanitizeReturnTo,
} from './auth-redirect';

describe('auth-redirect', () => {
  it('el destino por defecto es el dashboard de documentos, no la pantalla de creación', () => {
    expect(DEFAULT_AUTHENTICATED_ROUTE).toBe('/dashboard/documents');
  });

  describe('sanitizeReturnTo', () => {
    it.each([
      ['/dashboard/documents/doc-1', '/dashboard/documents/doc-1'],
      [
        '/dashboard/documents?view=pending&q=contrato',
        '/dashboard/documents?view=pending&q=contrato',
      ],
      ['/dashboard/plans#anual', '/dashboard/plans#anual'],
      ['/dashboard/documents/create', '/dashboard/documents/create'],
    ])('acepta la ruta interna %s', (value, expected) => {
      expect(sanitizeReturnTo(value)).toBe(expected);
    });

    it.each([
      ['vacío', ''],
      ['nulo', null],
      ['URL absoluta', 'https://evil.com/dashboard'],
      ['protocol-relative', '//evil.com/dashboard'],
      ['barra invertida', '/\\evil.com'],
      ['sin barra inicial', 'dashboard/documents'],
      ['javascript:', 'javascript:alert(1)'],
      ['el propio login', '/login'],
      ['el login con query', '/login?returnTo=%2Fdashboard'],
      ['el registro', '/signup'],
      ['la verificación OTP', '/signup/verify'],
      ['recuperar contraseña', '/forgot-password/'],
      ['demasiado larga', `/${'a'.repeat(3000)}`],
    ])('rechaza %s', (_case, value) => {
      expect(sanitizeReturnTo(value)).toBeNull();
    });
  });

  describe('buildLoginPath', () => {
    it('recuerda la ruta protegida con su query', () => {
      expect(buildLoginPath('/dashboard/documents/doc-1?tab=firmas')).toBe(
        '/login?returnTo=%2Fdashboard%2Fdocuments%2Fdoc-1%3Ftab%3Dfirmas',
      );
    });

    it.each([undefined, null, '/', '//evil.com', '/login'])(
      'sin ruta útil (%s) manda a /login a secas',
      (value) => {
        expect(buildLoginPath(value)).toBe('/login');
      },
    );
  });

  describe('resolvePostLoginDestination', () => {
    it('sin ruta previa, va al dashboard de documentos', () => {
      expect(resolvePostLoginDestination('')).toBe('/dashboard/documents');
    });

    it('con una ruta protegida previa, vuelve a ella', () => {
      expect(
        resolvePostLoginDestination(
          '?returnTo=%2Fdashboard%2Fdocuments%2Fdoc-1%3Ftab%3Dfirmas',
        ),
      ).toBe('/dashboard/documents/doc-1?tab=firmas');
    });

    it('conserva otros parámetros del login sin confundirlos con el destino', () => {
      expect(
        resolvePostLoginDestination('?reset=1&returnTo=%2Fdashboard%2Fplans'),
      ).toBe('/dashboard/plans');
    });

    it('ignora un destino externo y cae en el dashboard de documentos', () => {
      expect(
        resolvePostLoginDestination('?returnTo=https%3A%2F%2Fevil.com'),
      ).toBe('/dashboard/documents');
    });
  });
});
