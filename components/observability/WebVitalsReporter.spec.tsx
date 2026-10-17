import * as Sentry from '@sentry/nextjs';
import type { Event } from '@sentry/nextjs';
import { render } from '@testing-library/react';
import { useReportWebVitals } from 'next/web-vitals';

import WebVitalsReporter, {
  createWebVitalsHandler,
  sendWebVitalReport,
} from './WebVitalsReporter';
import {
  buildWebVitalReport,
  scrubBrowserTransaction,
} from '@/lib/observability/web-vitals';
import { scrubSensitiveRequestData } from '@/lib/sentry/sentry-options';

jest.mock('next/web-vitals', () => ({ useReportWebVitals: jest.fn() }));

const mockedUseReportWebVitals = useReportWebVitals as jest.Mock;

describe('createWebVitalsHandler', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SENTRY_ENVIRONMENT: 'production',
      NEXT_PUBLIC_GIT_COMMIT_SHA: 'abc123',
    } as NodeJS.ProcessEnv;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('reporta sólo los datos permitidos, con la ruta de la carga', () => {
    const send = jest.fn();
    const handler = createWebVitalsHandler({
      pathname: '/dashboard/documents/6f1c',
      pageloadSpan: undefined,
      send,
    });

    handler({ name: 'LCP', value: 2100 });

    expect(send).toHaveBeenCalledWith(
      {
        metric: 'LCP',
        value: 2100,
        rating: 'good',
        route: '/dashboard/documents/[documentId]',
        environment: 'production',
        release: 'signature-app@abc123',
      },
      undefined,
    );
  });

  it('ignora FID, valores no numéricos y repeticiones exactas', () => {
    const send = jest.fn();
    const handler = createWebVitalsHandler({
      pathname: '/login',
      pageloadSpan: undefined,
      send,
    });

    handler({ name: 'FID', value: 10 });
    handler({ name: 'INP', value: Number.NaN });
    handler({ name: 'CLS', value: 0.05 });
    handler({ name: 'CLS', value: 0.05 });
    handler({ name: 'CLS', value: 0.2 });

    expect(send).toHaveBeenCalledTimes(2);
  });

  it('nunca propaga un fallo del envío', () => {
    const handler = createWebVitalsHandler({
      pathname: '/login',
      pageloadSpan: undefined,
      send: () => {
        throw new Error('sin red');
      },
    });

    expect(() => handler({ name: 'LCP', value: 1 })).not.toThrow();
  });
});

describe('WebVitalsReporter', () => {
  it('no pinta nada y conserva el mismo manejador entre renders', () => {
    mockedUseReportWebVitals.mockClear();
    const { container, rerender } = render(<WebVitalsReporter />);
    rerender(<WebVitalsReporter />);

    expect(container).toBeEmptyDOMElement();
    const [first, second] = mockedUseReportWebVitals.mock.calls;
    expect(first[0]).toBe(second[0]);
  });
});

/**
 * Contra un cliente real del SDK con un transporte que guarda los envelopes en vez de mandarlos:
 * `beforeSendTransaction` aplica la misma limpieza que `sentry.client.config.ts`, y se revisa lo
 * que de verdad saldría por la red (cabeceras del envelope incluidas).
 */
describe('sendWebVitalReport', () => {
  let sent: Event[];
  let envelopes: string[];

  function initSentry(tracesSampleRate: number) {
    sent = [];
    envelopes = [];
    Sentry.init({
      dsn: 'https://public@glitchtip.example.com/1',
      tracesSampleRate,
      traceLifecycle: 'static',
      defaultIntegrations: false,
      integrations: [Sentry.httpContextIntegration()],
      transport: (options: Parameters<typeof Sentry.createTransport>[0]) =>
        Sentry.createTransport(options, async (request) => {
          envelopes.push(
            typeof request.body === 'string'
              ? request.body
              : new TextDecoder().decode(request.body),
          );
          return { statusCode: 200 };
        }),
      beforeSendTransaction: (event) => {
        const scrubbed = scrubBrowserTransaction(
          scrubSensitiveRequestData(event),
        );
        sent.push(scrubbed);
        return scrubbed;
      },
    });
  }

  /**
   * Como la del App Router sin manifiesto de rutas: nombrada con el `pathname` crudo y con origen
   * `url`, que es lo que hace que el SDK no copie ese nombre al contexto de muestreo.
   */
  function pageload() {
    const span = Sentry.startInactiveSpan({
      name: '/dashboard/documents/6f1c',
      op: 'pageload',
      forceTransaction: true,
      attributes: { 'sentry.segment.name.source': 'url' },
    });
    span.end();
    return span;
  }

  const report = buildWebVitalReport({
    metric: 'LCP',
    value: 2100,
    pathname: '/dashboard/documents/6f1c',
    environment: 'production',
    release: 'signature-app@abc123',
  });

  afterEach(async () => {
    await Sentry.close();
  });

  it('envía una transacción por ruta y métrica, en la traza de la carga y sin PII', async () => {
    initSentry(1);
    window.history.pushState({}, '', '/dashboard/documents/6f1c?token=x#y');
    const pageloadSpan = pageload();

    sendWebVitalReport(report, pageloadSpan);
    await Sentry.flush();

    const vital = sent.find(
      (event) => event.contexts?.trace?.op === 'web.vital.lcp',
    );
    expect(vital).toBeDefined();
    expect(vital?.transaction).toBe('/dashboard/documents/[documentId]');
    expect(vital?.contexts?.trace?.trace_id).toBe(
      pageloadSpan.spanContext().traceId,
    );
    expect(vital?.contexts?.trace?.parent_span_id).toBe(
      pageloadSpan.spanContext().spanId,
    );
    expect(vital?.measurements?.lcp).toEqual({
      value: 2100,
      unit: 'millisecond',
    });
    expect(vital?.tags).toMatchObject({ 'web_vital.rating': 'good' });
    expect(vital?.request).toBeUndefined();

    const vitalEnvelope = envelopes.find((envelope) =>
      envelope.includes('web.vital.lcp'),
    );
    expect(vitalEnvelope).toBeDefined();
    expect(vitalEnvelope).not.toContain('6f1c');
    expect(vitalEnvelope).not.toContain('token');
    expect(vitalEnvelope).not.toMatch(/Mozilla|jsdom/);
    // La carga de página también sale con la ruta normalizada y sin query.
    expect(envelopes).toHaveLength(2);
    envelopes.forEach((envelope) => {
      expect(envelope).not.toContain('6f1c');
      expect(envelope).not.toContain('token');
    });
  });

  it('una carga no muestreada no reporta sus métricas', async () => {
    initSentry(0);
    const pageloadSpan = pageload();

    sendWebVitalReport(report, pageloadSpan);
    await Sentry.flush();

    expect(sent).toEqual([]);
  });
});
