import fs from 'node:fs';
import path from 'node:path';

import { normalizeRoute, UNMATCHED_ROUTE } from './normalize-route';

const DOCUMENT_ID = '9fc1a3b2-7a5d-4c8d-a112-123456789abc';

describe('normalizeRoute', () => {
  describe('rutas estáticas', () => {
    it.each([
      '/dashboard',
      '/dashboard/documents',
      '/dashboard/documents/create',
      '/dashboard/organization/settings/roles',
      '/login',
      '/signup/verify',
      '/',
    ])('%s sale igual', (route) => {
      expect(normalizeRoute(route)).toBe(route);
    });

    it.each(['to-sign', 'sent', 'created', 'completed'])(
      'la ruta vieja /dashboard/documents/%s no se toma por un id',
      (legacy) => {
        expect(normalizeRoute(`/dashboard/documents/${legacy}`)).toBe(
          `/dashboard/documents/${legacy}`,
        );
      },
    );
  });

  describe('patrones dinámicos', () => {
    it.each([
      ['/dashboard/documents/abc-123', '/dashboard/documents/[documentId]'],
      [
        `/dashboard/documents/${DOCUMENT_ID}`,
        '/dashboard/documents/[documentId]',
      ],
      [
        `/dashboard/documents/${DOCUMENT_ID}/history`,
        '/dashboard/documents/[documentId]/history',
      ],
      [
        '/dashboard/organizations/org_8f3a',
        '/dashboard/organizations/[organizationId]',
      ],
      [
        '/dashboard/organizations/org_8f3a/members',
        '/dashboard/organizations/[organizationId]/members',
      ],
      ['/public/documents/doc-456', '/public/documents/[id]'],
      ['/public/documents/doc-456/sign', '/public/documents/[id]/sign'],
      ['/sign/q3VbX7f0_Lr9-ZtKp2NcWm4YhA8sDe1JuGo6BiQk5Rv', '/sign/[token]'],
      [
        '/public/documents/doc-456/advanced-signature',
        '/public/documents/[id]/advanced-signature',
      ],
      [
        '/public/documents/doc-456/biometric-signature',
        '/public/documents/[id]/biometric-signature',
      ],
      [
        '/public/documents/doc-456/signatures/collab-789',
        '/public/documents/[id]/signatures/[collaboratorId]',
      ],
    ])('%s → %s', (pathname, route) => {
      const normalized = normalizeRoute(pathname);

      expect(normalized).toBe(route);
      expect(normalized).not.toMatch(
        /abc-123|9fc1a3b2|org_8f3a|doc-456|collab-789/,
      );
    });
  });

  describe('query params, fragmentos y URL completa', () => {
    it.each([
      [
        '/public/documents/doc-456/sign?token=secret#signature',
        '/public/documents/[id]/sign',
      ],
      ['/dashboard/documents?view=completed', '/dashboard/documents'],
      ['/dashboard/documents#top', '/dashboard/documents'],
      ['/login?next=/dashboard&email=ana@example.com', '/login'],
      [
        '/dashboard/documents/abc-123#signers',
        '/dashboard/documents/[documentId]',
      ],
      [
        'https://app.example.com/dashboard/documents/abc-123?x=1',
        '/dashboard/documents/[documentId]',
      ],
      ['https://app.example.com', '/'],
      ['/dashboard/documents/', '/dashboard/documents'],
      ['//dashboard//documents', '/dashboard/documents'],
    ])('%s → %s', (pathname, route) => {
      const normalized = normalizeRoute(pathname);

      expect(normalized).toBe(route);
      expect(normalized).not.toMatch(
        /[?#]|token|secret|view=|ana@|example\.com|https?:/,
      );
    });
  });

  describe('rutas no reconocidas', () => {
    it.each([
      '/reset/ana@example.com/tok_123',
      '/dashboard/unknown/abc-123',
      '/api/v1/document/abc-123',
      '/public/documents',
      '/Dashboard/documents',
    ])('%s no sale tal cual', (pathname) => {
      expect(normalizeRoute(pathname)).toBe(UNMATCHED_ROUTE);
    });
  });

  describe('entradas inválidas o vacías', () => {
    it.each([
      ['vacía', ''],
      ['sólo espacios', '   '],
      ['sin barra inicial', 'dashboard/documents'],
      ['sólo query', '?token=secret'],
      ['sólo fragmento', '#signature'],
      ['null', null],
      ['undefined', undefined],
      ['número', 42],
    ])('%s → UNMATCHED_ROUTE', (_label, input) => {
      expect(normalizeRoute(input as string)).toBe(UNMATCHED_ROUTE);
    });
  });

  it('cubre todas las pantallas de app/', () => {
    const appDir = path.join(process.cwd(), 'app');
    const templates: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name === 'page.tsx') {
          const segments = path
            .relative(appDir, dir)
            .split(path.sep)
            .filter((s) => s && !/^\(.*\)$/.test(s));
          templates.push(`/${segments.join('/')}`);
        }
      }
    };
    walk(appDir);

    expect(templates.length).toBeGreaterThan(0);
    for (const template of templates) {
      // Cada parámetro de la carpeta se reemplaza por un valor real.
      const pathname = template.replace(/\[[^\]]+\]/g, 'real-value-1');
      expect([template, normalizeRoute(pathname)]).toEqual([
        template,
        template,
      ]);
    }
  });
});
