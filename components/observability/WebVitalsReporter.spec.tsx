/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "http://127.0.0.1/dashboard/documents/9b2c4e1a-7d3f-4c51-a0f2-1e6d8b7c5a90?view=completed&email=ana%40example.com#signers"}
 */
import fs from 'node:fs';
import path from 'node:path';

import * as Sentry from '@sentry/nextjs';
import type { Event, Span } from '@sentry/nextjs';
import { render } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { useReportWebVitals } from 'next/web-vitals';

import { uploadAwareTracesSampler } from '@/lib/observability/upload-metrics';
import {
  buildWebVitalReport,
  isReportedWebVital,
  normalizeRoute,
  rateWebVital,
  ROUTE_TEMPLATES,
  scrubWebVitalTransaction,
  shouldSampleWebVitals,
  UNMATCHED_ROUTE,
  webVitalAwareTracesSampler,
} from '@/lib/observability/web-vitals';
import { WebVitalsReporter } from './WebVitalsReporter';

jest.mock('next/web-vitals', () => ({ useReportWebVitals: jest.fn() }));
jest.mock('next/navigation', () => ({ usePathname: jest.fn() }));

const DOCUMENT_ID = '9b2c4e1a-7d3f-4c51-a0f2-1e6d8b7c5a90';
const DOCUMENT_PATH = `/dashboard/documents/${DOCUMENT_ID}`;

describe('isReportedWebVital', () => {
  it.each(['LCP', 'INP', 'CLS', 'FCP', 'TTFB'])('%s se reporta', (name) => {
    expect(isReportedWebVital(name)).toBe(true);
  });

  it.each(['FID', 'lcp', 'Next.js-hydration', ''])('%s no', (name) => {
    expect(isReportedWebVital(name)).toBe(false);
  });
});

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
    ['TTFB', 1000, 'needs-improvement'],
    ['TTFB', 1801, 'poor'],
  ] as const)('%s %d → %s', (name, value, rating) => {
    expect(rateWebVital(name, value)).toBe(rating);
  });
});

describe('normalizeRoute', () => {
  it.each([
    [DOCUMENT_PATH, '/dashboard/documents/[documentId]'],
    ['/dashboard/documents/create', '/dashboard/documents/create'],
    ['/dashboard/documents?view=completed#x', '/dashboard/documents'],
    ['/dashboard/documents/', '/dashboard/documents'],
    ['/public/documents/42/sign', '/public/documents/[id]/sign'],
    ['/public/documents/42', '/public/documents/[id]'],
    [
      '/public/documents/42/signatures/c-77',
      '/public/documents/[id]/signatures/[collaboratorId]',
    ],
    [
      '/dashboard/organizations/org_8f3a/members',
      '/dashboard/organizations/[organizationId]/members',
    ],
    ['/login', '/login'],
  ])('%s → %s', (pathname, route) => {
    expect(normalizeRoute(pathname)).toBe(route);
  });

  it('una ruta desconocida no sale tal cual', () => {
    expect(normalizeRoute('/reset/ana@example.com/tok_123')).toBe(
      UNMATCHED_ROUTE,
    );
    expect(normalizeRoute('/')).toBe(UNMATCHED_ROUTE);
    expect(normalizeRoute(null)).toBe(UNMATCHED_ROUTE);
  });

  it('cubre todas las pantallas de app/', () => {
    const appDir = path.join(process.cwd(), 'app');
    const routes: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name === 'page.tsx') {
          const segments = path
            .relative(appDir, dir)
            .split(path.sep)
            .filter((s) => s && !/^\(.*\)$/.test(s));
          routes.push(`/${segments.join('/')}`);
        }
      }
    };
    walk(appDir);

    expect([...ROUTE_TEMPLATES].sort()).toEqual(routes.sort());
  });
});

describe('buildWebVitalReport', () => {
  it('lleva sólo métrica, valor, clasificación, ruta, ambiente y release', () => {
    expect(
      buildWebVitalReport(
        'LCP',
        2100.4,
        `${DOCUMENT_PATH}?token=abc`,
        'production',
        'signature-app@3f2a9c1',
      ),
    ).toEqual({
      metric: 'LCP',
      value: 2100,
      rating: 'good',
      route: '/dashboard/documents/[documentId]',
      environment: 'production',
      release: 'signature-app@3f2a9c1',
    });
  });

  it('CLS conserva los decimales', () => {
    expect(
      buildWebVitalReport('CLS', 0.123456, '/login', 'production', undefined)
        .value,
    ).toBe(0.1235);
  });
});

describe('shouldSampleWebVitals', () => {
  const spanWithFlags = (traceFlags: number) =>
    ({ spanContext: () => ({ traceFlags }) }) as unknown as Span;

  it('hereda la decisión del pageload, sin sortear', () => {
    const random = jest.fn(() => 0);

    expect(shouldSampleWebVitals(spanWithFlags(1), 0, random)).toBe(true);
    expect(shouldSampleWebVitals(spanWithFlags(0), 1, random)).toBe(false);
    expect(random).not.toHaveBeenCalled();
  });

  it('sin pageload sortea con la tasa estándar', () => {
    expect(shouldSampleWebVitals(undefined, 0.1, () => 0.05)).toBe(true);
    expect(shouldSampleWebVitals(undefined, 0.1, () => 0.1)).toBe(false);
    expect(shouldSampleWebVitals(undefined, 0, () => 0)).toBe(false);
  });
});

describe('webVitalAwareTracesSampler', () => {
  const sampler = webVitalAwareTracesSampler(uploadAwareTracesSampler(0.1));
  const context = (op?: string) => ({
    attributes: op ? { 'sentry.op': op } : {},
    inheritOrSampleWith: (rate: number) => rate,
  });

  it('no vuelve a sortear las transacciones de Web Vitals', () => {
    expect(sampler(context('web_vital.lcp'))).toBe(1);
  });

  it('el resto sigue la política estándar', () => {
    expect(sampler(context('pageload'))).toBe(0.1);
    expect(sampler(context('document.upload'))).toBe(1);
  });
});

describe('scrubWebVitalTransaction', () => {
  it('deja sólo la traza, la señal y sus etiquetas', () => {
    const event: Event = {
      type: 'transaction',
      transaction: 'web_vital:/dashboard/documents/[documentId]',
      request: {
        url: `http://app${DOCUMENT_PATH}?email=ana@example.com`,
        headers: { 'User-Agent': 'Mozilla/5.0', Cookie: 'token=jwt' },
      },
      user: { email: 'ana@example.com' },
      breadcrumbs: [{ message: DOCUMENT_ID }],
      extra: { form: 'x' },
      tags: { 'account.id': 'acc_1' },
      contexts: {
        browser: { name: 'Chrome', version: '130.0.1' },
        trace: {
          trace_id: 't',
          span_id: 's',
          op: 'web_vital.lcp',
          data: {
            'sentry.op': 'web_vital.lcp',
            'web_vital.metric': 'LCP',
            'web_vital.value': 2100,
            'web_vital.rating': 'good',
            'web_vital.route': '/dashboard/documents/[documentId]',
            'url.full': `http://app${DOCUMENT_PATH}`,
          },
        },
      },
    };

    const scrubbed = scrubWebVitalTransaction(event);

    expect(scrubbed.request).toBeUndefined();
    expect(scrubbed.user).toBeUndefined();
    expect(scrubbed.breadcrumbs).toBeUndefined();
    expect(scrubbed.extra).toBeUndefined();
    expect(Object.keys(scrubbed.contexts ?? {})).toEqual(['trace']);
    expect(scrubbed.tags).toEqual({
      metric: 'LCP',
      rating: 'good',
      route: '/dashboard/documents/[documentId]',
    });
    expect(JSON.stringify(scrubbed)).not.toMatch(
      new RegExp(`${DOCUMENT_ID}|ana@example|Mozilla|jwt|Chrome|acc_1`),
    );
  });

  it('no toca las demás transacciones', () => {
    const event: Event = {
      type: 'transaction',
      request: { url: 'http://app/login' },
      contexts: { trace: { trace_id: 't', span_id: 's', op: 'pageload' } },
    };

    expect(scrubWebVitalTransaction(event).request).toEqual({
      url: 'http://app/login',
    });
  });
});

/**
 * Contra un cliente real del SDK (sin red) con `browserTracingIntegration`, que abre el `pageload`
 * de la URL de jsdom —con id, query y fragmento—, y el mismo sampler y limpieza que
 * `sentry.client.config.ts`.
 */
describe('WebVitalsReporter', () => {
  let sent: Event[];
  /** Cuerpos de los envelopes tal como salen por el transporte. */
  let wire: string[];

  beforeAll(() => {
    // jsdom no trae la API de entradas de rendimiento que consulta `browserTracingIntegration`.
    if (typeof performance.getEntriesByType !== 'function') {
      Object.assign(performance, { getEntriesByType: () => [] });
    }
  });

  function initSentry(sampleRate: number) {
    sent = [];
    wire = [];
    Sentry.init({
      dsn: 'https://public@glitchtip.example.com/1',
      environment: 'production',
      release: 'signature-app@3f2a9c1',
      tracesSampler: webVitalAwareTracesSampler(
        uploadAwareTracesSampler(sampleRate),
      ),
      traceLifecycle: 'static',
      integrations: [
        Sentry.browserTracingIntegration({
          idleTimeout: 50,
          finalTimeout: 5000,
        }),
      ],
      transport: (options: Parameters<typeof Sentry.createTransport>[0]) =>
        Sentry.createTransport(options, async (request) => {
          wire.push(
            typeof request.body === 'string'
              ? request.body
              : new TextDecoder().decode(request.body),
          );
          return { statusCode: 200 };
        }),
      beforeSendTransaction: (event) => {
        const scrubbed = scrubWebVitalTransaction(event);
        sent.push(scrubbed);
        return scrubbed;
      },
    });
  }

  /** Monta el componente y devuelve el callback que recibió `useReportWebVitals`. */
  function mount(pathname = DOCUMENT_PATH) {
    jest.mocked(usePathname).mockReturnValue(pathname);
    const view = render(<WebVitalsReporter />);
    const calls = jest.mocked(useReportWebVitals).mock.calls;
    const report = calls[calls.length - 1][0] as (metric: {
      name: string;
      value: number;
    }) => void;
    return { view, report };
  }

  async function settle() {
    // Deja cerrar el `pageload` y vacía la cola del cliente.
    await new Promise((resolve) => setTimeout(resolve, 150));
    await Sentry.flush();
  }

  const webVitals = () =>
    sent.filter((e) => e.contexts?.trace?.op?.startsWith('web_vital.'));

  afterEach(async () => {
    await Sentry.close();
    jest.mocked(useReportWebVitals).mockClear();
  });

  it('reporta LCP, INP, CLS, FCP y TTFB colgados del pageload', async () => {
    initSentry(1);
    const pageload = Sentry.getActiveSpan();
    expect(pageload).toBeDefined();

    const { report } = mount();
    report({ name: 'TTFB', value: 120 });
    report({ name: 'FCP', value: 900 });
    report({ name: 'LCP', value: 2100 });
    report({ name: 'CLS', value: 0.31 });
    report({ name: 'INP', value: 350 });
    await settle();

    const events = webVitals();
    expect(events.map((e) => e.tags?.metric).sort()).toEqual([
      'CLS',
      'FCP',
      'INP',
      'LCP',
      'TTFB',
    ]);
    for (const event of events) {
      expect(event.transaction).toBe(
        'web_vital:/dashboard/documents/[documentId]',
      );
      expect(event.environment).toBe('production');
      expect(event.release).toBe('signature-app@3f2a9c1');
      expect(event.contexts?.trace?.trace_id).toBe(
        pageload?.spanContext().traceId,
      );
      expect(event.contexts?.trace?.parent_span_id).toBe(
        pageload?.spanContext().spanId,
      );
    }

    const lcp = events.find((e) => e.tags?.metric === 'LCP');
    expect(lcp?.contexts?.trace?.op).toBe('web_vital.lcp');
    expect(lcp?.tags).toEqual({
      metric: 'LCP',
      rating: 'good',
      route: '/dashboard/documents/[documentId]',
    });
    expect(lcp?.measurements).toEqual({
      lcp: { value: 2100, unit: 'millisecond' },
    });
    // La duración de la transacción es el valor de la métrica.
    expect(
      ((lcp?.timestamp ?? 0) - (lcp?.start_timestamp ?? 0)) * 1000,
    ).toBeCloseTo(2100, 0);

    const cls = events.find((e) => e.tags?.metric === 'CLS');
    expect(cls?.tags?.rating).toBe('poor');
    expect(cls?.measurements).toEqual({ cls: { value: 0.31, unit: '' } });
    expect(events.find((e) => e.tags?.metric === 'INP')?.tags?.rating).toBe(
      'needs-improvement',
    );
  });

  it('no envía la URL, el id, la query, el fragmento ni el user agent', async () => {
    initSentry(1);
    document.cookie = 'token=jwt-secreto';

    const { report } = mount();
    report({ name: 'LCP', value: 2100 });
    await settle();

    const [event] = webVitals();
    expect(event).toBeDefined();
    expect(event.request).toBeUndefined();
    expect(event.user).toBeUndefined();

    // Lo que de verdad sale hacia GlitchTip: el envelope de la transacción, con su encabezado.
    const envelopes = wire.filter((body) => body.includes('"web_vital.lcp"'));
    expect(envelopes).toHaveLength(1);
    expect(envelopes[0]).not.toMatch(
      /9b2c4e1a|view=|completed|ana|example\.com|signers|jsdom|Mozilla|jwt-secreto/,
    );
  });

  it('ignora FID y las métricas propias de Next', async () => {
    initSentry(1);

    const { report } = mount();
    report({ name: 'FID', value: 10 });
    report({ name: 'Next.js-hydration', value: 40 });
    await settle();

    expect(webVitals()).toHaveLength(0);
  });

  it('reporta cada métrica una sola vez por carga', async () => {
    initSentry(1);

    const { report } = mount();
    report({ name: 'LCP', value: 2100 });
    report({ name: 'LCP', value: 2300 });
    await settle();

    expect(webVitals()).toHaveLength(1);
  });

  it('si el pageload no se muestreó, no reporta nada', async () => {
    initSentry(0);

    const { report } = mount();
    report({ name: 'LCP', value: 2100 });
    report({ name: 'CLS', value: 0.01 });
    await settle();

    expect(sent).toHaveLength(0);
  });

  it('usa la ruta de la carga aunque luego se navegue', async () => {
    initSentry(1);

    const { view, report } = mount();
    jest.mocked(usePathname).mockReturnValue('/dashboard/directory');
    view.rerender(<WebVitalsReporter />);
    report({ name: 'CLS', value: 0.02 });
    await settle();

    expect(webVitals()[0]?.tags?.route).toBe(
      '/dashboard/documents/[documentId]',
    );
  });

  it('no renderiza nada', () => {
    initSentry(1);

    const { view } = mount();

    expect(view.container).toBeEmptyDOMElement();
  });

  it('si la telemetría falla, no propaga el error', () => {
    initSentry(1);

    const { report } = mount();
    const broken = {
      name: 'LCP',
      get value(): number {
        throw new Error('boom');
      },
    };

    expect(() => report(broken)).not.toThrow();
  });
});
