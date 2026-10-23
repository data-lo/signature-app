import {
  buildPublicDocumentUrl,
  publicDocumentPath,
} from './document-public-url';

describe('buildPublicDocumentUrl', () => {
  it('apunta al visor público del documento y a ninguna ruta del dashboard', () => {
    const url = buildPublicDocumentUrl('doc-1', 'https://app.ejemplo.com');

    expect(url).toBe('https://app.ejemplo.com/public/documents/doc-1');
    expect(url).not.toContain('/dashboard');
  });

  it('no duplica la barra cuando el origen ya viene con una al final', () => {
    expect(buildPublicDocumentUrl('doc-1', 'https://app.ejemplo.com/')).toBe(
      'https://app.ejemplo.com/public/documents/doc-1',
    );
  });

  it('toma el origen de la ventana cuando no se le pasa uno', () => {
    expect(buildPublicDocumentUrl('doc-1')).toBe(
      `${window.location.origin}/public/documents/doc-1`,
    );
  });

  it('cae a la ruta relativa si no hay origen (SSR)', () => {
    expect(buildPublicDocumentUrl('doc-1', '')).toBe('/public/documents/doc-1');
  });

  it('publicDocumentPath es la misma ruta que registra el App Router', () => {
    expect(publicDocumentPath('doc-1')).toBe('/public/documents/doc-1');
  });
});
