import { readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { APP_ROUTE_TEMPLATES, normalizeRoute } from './normalize-route';

/** Rutas de los `page.tsx` de `app/`, sin grupos de ruta, como las sirve Next. */
function appPageRoutes(): string[] {
  const appDir = join(process.cwd(), 'app');
  return readdirSync(appDir, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.split(sep).pop() === 'page.tsx')
    .map((file) => {
      const segments = relative(appDir, join(appDir, file))
        .split(sep)
        .slice(0, -1)
        .filter((segment) => !/^\(.*\)$/.test(segment));
      return `/${segments.join('/')}`;
    });
}

describe('normalizeRoute', () => {
  it('conoce todas las páginas de app/', () => {
    const missing = appPageRoutes().filter(
      (route) => !APP_ROUTE_TEMPLATES.includes(route),
    );

    expect(missing).toEqual([]);
  });

  it('cambia los ids por el nombre del segmento dinámico', () => {
    expect(
      normalizeRoute(
        '/dashboard/documents/6f1c2a90-1b2c-4d3e-9f00-aa11bb22cc33',
      ),
    ).toBe('/dashboard/documents/[documentId]');
    expect(normalizeRoute('/dashboard/organizations/org-42/members')).toBe(
      '/dashboard/organizations/[organizationId]/members',
    );
    expect(normalizeRoute('/public/documents/abc/signatures/xyz')).toBe(
      '/public/documents/[id]/signatures/[collaboratorId]',
    );
  });

  it('prefiere la ruta fija a la dinámica, como el App Router', () => {
    expect(normalizeRoute('/dashboard/documents/create')).toBe(
      '/dashboard/documents/create',
    );
  });

  it('descarta query, fragmento y barra final', () => {
    expect(normalizeRoute('/dashboard/documents/?view=completed#top')).toBe(
      '/dashboard/documents',
    );
    expect(normalizeRoute('/join?token=secreto')).toBe('/join');
  });

  it('en una ruta desconocida no deja pasar segmentos que no sean nombres fijos', () => {
    expect(normalizeRoute('/dashboard/ana@example.com/abc123')).toBe(
      '/dashboard/[segment]/[segment]',
    );
  });

  it('es idempotente', () => {
    for (const template of APP_ROUTE_TEMPLATES) {
      expect(normalizeRoute(template)).toBe(template);
    }
  });
});
