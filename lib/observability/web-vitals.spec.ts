import type { Event } from '@sentry/nextjs';

import {
  buildWebVitalReport,
  isReportedWebVital,
  rateWebVital,
  scrubBrowserTransaction,
  webVitalTransactionDurationMs,
} from './web-vitals';

describe('rateWebVital', () => {
  it.each([
    ['LCP', 2500, 'good'],
    ['LCP', 2501, 'needs-improvement'],
    ['LCP', 4001, 'poor'],
    ['INP', 200, 'good'],
    ['INP', 500, 'needs-improvement'],
    ['INP', 501, 'poor'],
    ['CLS', 0.1, 'good'],
    ['CLS', 0.25, 'needs-improvement'],
    ['CLS', 0.26, 'poor'],
    ['FCP', 1800, 'good'],
    ['FCP', 3001, 'poor'],
    ['TTFB', 800, 'good'],
    ['TTFB', 1800, 'needs-improvement'],
  ] as const)('%s = %d es %s', (metric, value, rating) => {
    expect(rateWebVital(metric, value)).toBe(rating);
  });
});

describe('isReportedWebVital', () => {
  it('reporta las cinco métricas y descarta FID y las métricas propias de Next', () => {
    expect(['LCP', 'INP', 'CLS', 'FCP', 'TTFB'].every(isReportedWebVital)).toBe(
      true,
    );
    expect(isReportedWebVital('FID')).toBe(false);
    expect(isReportedWebVital('Next.js-hydration')).toBe(false);
  });
});

describe('buildWebVitalReport', () => {
  it('lleva exactamente los datos permitidos', () => {
    const report = buildWebVitalReport({
      metric: 'LCP',
      value: 2100.4,
      pathname: '/dashboard/documents/abc?view=completed#x',
      environment: 'production',
      release: 'signature-app@abc123',
    });

    expect(report).toEqual({
      metric: 'LCP',
      value: 2100,
      rating: 'good',
      route: '/dashboard/documents/[documentId]',
      environment: 'production',
      release: 'signature-app@abc123',
    });
  });

  it('conserva los decimales de CLS', () => {
    const report = buildWebVitalReport({
      metric: 'CLS',
      value: 0.123456,
      pathname: '/login',
      environment: 'production',
      release: undefined,
    });

    expect(report.value).toBe(0.1235);
    expect(report.rating).toBe('needs-improvement');
    expect(webVitalTransactionDurationMs(report)).toBeCloseTo(123.5);
  });
});

describe('scrubBrowserTransaction', () => {
  function transaction(op: string, overrides: Partial<Event> = {}): Event {
    return {
      type: 'transaction',
      transaction: '/dashboard/documents/6f1c',
      contexts: {
        trace: {
          trace_id: 't',
          span_id: 's',
          op,
          data: {
            'url.full': 'https://app.test/dashboard/documents/6f1c?x=1',
            'http.query': '?x=1',
            'http.fragment': '#y',
            'sentry.op': op,
          },
        },
      },
      request: {
        url: 'https://app.test/dashboard/documents/6f1c?x=1#y',
        query_string: 'x=1',
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0…)' },
      },
      ...overrides,
    };
  }

  it('nombra la carga de página con la ruta y le quita la URL completa', () => {
    const event = scrubBrowserTransaction(transaction('pageload'));

    expect(event.transaction).toBe('/dashboard/documents/[documentId]');
    expect(event.request?.url).toBe(
      'https://app.test/dashboard/documents/[documentId]',
    );
    expect(event.request?.query_string).toBeUndefined();
    expect(event.contexts?.trace?.data).toEqual({ 'sentry.op': 'pageload' });
  });

  it('limpia los spans hijos y el Referer de la carga de página', () => {
    const event = scrubBrowserTransaction(
      transaction('pageload', {
        spans: [
          {
            span_id: 'c',
            trace_id: 't',
            start_timestamp: 0,
            status: 'ok',
            description: 'GET https://app.test/api/v1/documents?search=ana#x',
            data: {
              'url.full': 'https://app.test/api/v1/documents?search=ana',
              'http.method': 'GET',
            },
          },
        ],
        request: {
          url: 'https://app.test/login',
          headers: { Referer: 'https://app.test/join?token=x' },
        },
        breadcrumbs: [
          { category: 'navigation', data: { from: '/join?token=x', to: '/' } },
        ],
      }),
    );

    expect(event.breadcrumbs).toBeUndefined();

    expect(event.spans?.[0].description).toBe(
      'GET https://app.test/api/v1/documents',
    );
    expect(event.spans?.[0].data).toEqual({ 'http.method': 'GET' });
    expect(event.request?.headers).toEqual({});
  });

  it('a un Web Vital le quita la petición, el usuario y los breadcrumbs', () => {
    const event = scrubBrowserTransaction(
      transaction('web.vital.lcp', {
        user: { email: 'ana@example.com' },
        contexts: {
          trace: { trace_id: 't', span_id: 's', op: 'web.vital.lcp' },
          culture: { locale: 'es-MX', timezone: 'America/Mexico_City' },
        },
        breadcrumbs: [{ message: 'clic' }],
        extra: { form: 'x' },
      }),
    );

    expect(event.request).toBeUndefined();
    expect(event.user).toBeUndefined();
    expect(event.breadcrumbs).toBeUndefined();
    expect(event.extra).toBeUndefined();
    expect(Object.keys(event.contexts ?? {})).toEqual(['trace']);
    expect(event.transaction).toBe('/dashboard/documents/[documentId]');
  });
});
