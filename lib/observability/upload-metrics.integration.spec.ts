/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "http://127.0.0.1:39123/dashboard/documents/create"}
 */
import http from 'node:http';
import type { AddressInfo } from 'node:net';

import * as Sentry from '@sentry/nextjs';
import type { Event } from '@sentry/nextjs';

import apiClient from '@/lib/axios';
import { createDocumentSignaturesRequest } from '@/app/dashboard/documents/create/_requests';
import {
  scrubUploadTransaction,
  shouldCreateSpanForUploadRequest,
  uploadAwareTracesSampler,
} from './upload-metrics';

/**
 * Integración con XHR real (el adapter de axios en el navegador) contra un servidor HTTP local
 * que hace de proxy + backend: recibe el multipart completo y responde tras `BACKEND_DELAY_MS`.
 * Con `browserTracingIntegration` real, que abre la transacción de carga de página.
 *
 * Comprueba lo que una prueba con axios simulado no ve: que la duración incluye la subida y la
 * respuesta del servidor, que el span `http.client` automático no duplica la carga y que la
 * señal cuelga de la transacción de la página.
 */
const PORT = 39123;
const BACKEND_DELAY_MS = 300;

let server: http.Server;
let receivedBytes = 0;
let sent: Event[];

beforeAll(async () => {
  // jsdom no trae la API de entradas de rendimiento que `browserTracingIntegration` consulta para
  // las métricas de la página; vacía basta, aquí no se miden.
  if (typeof performance.getEntriesByType !== 'function') {
    Object.assign(performance, { getEntriesByType: () => [] });
  }

  server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    let bytes = 0;
    req.on('data', (chunk: Buffer) => {
      bytes += chunk.length;
    });
    req.on('end', () => {
      receivedBytes = bytes;
      setTimeout(() => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ data: { id: 'doc-6f1c' } }));
      }, BACKEND_DELAY_MS);
    });
  });
  await new Promise<void>((resolve) =>
    server.listen(PORT, '127.0.0.1', resolve),
  );
  expect((server.address() as AddressInfo).port).toBe(PORT);
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

beforeEach(() => {
  sent = [];
  Sentry.init({
    dsn: 'https://public@glitchtip.example.com/1',
    tracesSampler: uploadAwareTracesSampler(1),
    traceLifecycle: 'static',
    defaultIntegrations: false,
    integrations: [
      Sentry.browserTracingIntegration({
        shouldCreateSpanForRequest: shouldCreateSpanForUploadRequest,
        idleTimeout: 50,
        finalTimeout: 5000,
      }),
    ],
    transport: (options: Parameters<typeof Sentry.createTransport>[0]) =>
      Sentry.createTransport(options, async () => ({ statusCode: 200 })),
    beforeSendTransaction: (event) => {
      sent.push(scrubUploadTransaction(event));
      return null;
    },
  });
});

afterEach(async () => {
  await Sentry.close();
});

it('mide la carga real con una sola transacción, sin duplicar la petición', async () => {
  const pageload = Sentry.getActiveSpan();
  expect(pageload).toBeDefined();

  const file = new File([new Uint8Array(2 * 1024 * 1024)], 'contrato.pdf', {
    type: 'application/pdf',
  });
  const started = Date.now();

  // Una petición cualquiera, de control: ésta sí debe tener span automático.
  await apiClient.get('/api/v1/other').catch(() => undefined);
  const created = await createDocumentSignaturesRequest({
    file,
    documentData: {
      fileName: 'contrato.pdf',
      requiresApproval: false,
      isSequential: true,
      signatureType: 'SIMPLE',
      isIndexable: true,
    },
    collaborators: [],
    requiresDifferentSignatures: 'SIMPLE',
  });
  const elapsed = Date.now() - started;

  expect(created).toEqual({ id: 'doc-6f1c' });
  expect(receivedBytes).toBeGreaterThan(2 * 1024 * 1024);

  // Deja cerrar la transacción de la página.
  await new Promise((resolve) => setTimeout(resolve, 300));
  await Sentry.flush();

  const uploads = sent.filter((e) =>
    e.contexts?.trace?.op?.startsWith('document.upload'),
  );
  const pageloads = sent.filter((e) => e.contexts?.trace?.op === 'pageload');
  expect(uploads).toHaveLength(1);
  expect(pageloads).toHaveLength(1);

  const [upload] = uploads;
  const duration = upload.contexts?.trace?.data?.[
    'upload.duration_ms'
  ] as number;
  // Subida + "proxy" + respuesta del servidor: al menos la demora del backend.
  expect(duration).toBeGreaterThanOrEqual(BACKEND_DELAY_MS);
  expect(duration).toBeLessThanOrEqual(elapsed);
  expect(upload.contexts?.trace?.op).toBe('document.upload.success');

  // Cuelga de la carga de página, en la misma traza.
  expect(upload.contexts?.trace?.trace_id).toBe(
    pageloads[0].contexts?.trace?.trace_id,
  );
  expect(upload.contexts?.trace?.parent_span_id).toBe(
    pageloads[0].contexts?.trace?.span_id,
  );

  // Sin duplicado: la carga no tiene span http.client en ningún lado; la de control, sí.
  const httpSpans = sent.flatMap((e) =>
    (e.spans ?? []).filter((span) => span.op === 'http.client'),
  );
  expect(httpSpans.map((span) => span.description)).toEqual([
    'GET /api/api/v1/other',
  ]);
});
