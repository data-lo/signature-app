import * as Sentry from '@sentry/nextjs';
import type { Breadcrumb, ErrorEvent } from '@sentry/nextjs';
import {
  AxiosError,
  AxiosHeaders,
  CanceledError,
  type AxiosAdapter,
  type InternalAxiosRequestConfig,
} from 'axios';

import apiClient from '@/lib/axios';
import {
  annotateRequestSpan,
  buildApiRequestRecord,
  classifyApiFailure,
  filterApiErrorEvent,
  normalizeApiRoute,
  recordApiError,
  toStatusClass,
  trackRequestSpan,
} from './api-request';

/** Config mínima para armar un `AxiosError` como lo haría el adapter. */
function requestConfig(
  overrides: Partial<InternalAxiosRequestConfig> = {},
): InternalAxiosRequestConfig {
  return {
    method: 'get',
    url: '/api/v1/document/6f1c2a90-1b2c-4d3e',
    baseURL: '/api',
    headers: new AxiosHeaders({ Authorization: 'Bearer jwt' }),
    ...overrides,
  };
}

function httpError(status: number, config = requestConfig()) {
  return new AxiosError(
    `Request failed with status code ${status}`,
    status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
    config,
    {},
    {
      status,
      statusText: '',
      headers: {},
      config,
      data: { email: 'ana@example.com' },
    },
  );
}

describe('normalizeApiRoute', () => {
  it('cambia ids, tokens y correos por :id y conserva los nombres de recurso', () => {
    expect(
      normalizeApiRoute(
        '/api/v1/document/6f1c2a90-1b2c-4d3e-9f00-aa11bb22cc33/approval/approve',
      ),
    ).toBe('/api/v1/document/:id/approval/approve');
    expect(
      normalizeApiRoute('/api/v1/organizations/invitations/Ab3xYz/accept'),
    ).toBe('/api/v1/organizations/invitations/:id/accept');
    expect(normalizeApiRoute('/api/v1/users/ana@example.com')).toBe(
      '/api/v1/users/:id',
    );
    expect(normalizeApiRoute('/api/v1/users/me/personal-information')).toBe(
      '/api/v1/users/me/personal-information',
    );
  });

  it('elimina query y fragmento', () => {
    expect(
      normalizeApiRoute('/api/v1/document?search=ana&page=2#resultados'),
    ).toBe('/api/v1/document');
  });

  it('trata una palabra demasiado larga como dato', () => {
    expect(normalizeApiRoute(`/api/v1/document/${'a'.repeat(40)}`)).toBe(
      '/api/v1/document/:id',
    );
  });

  it('sólo mide rutas internas /api/*', () => {
    const origin = 'https://app.example.com';
    expect(
      normalizeApiRoute(
        'https://minio.example.com/bucket/x.pdf',
        '/api',
        origin,
      ),
    ).toBeNull();
    expect(
      normalizeApiRoute(
        'https://app.example.com/api/v1/document',
        '/api',
        origin,
      ),
    ).toBe('/api/v1/document');
    expect(normalizeApiRoute('/healthz', '')).toBeNull();
    expect(normalizeApiRoute(undefined)).toBeNull();
  });
});

describe('toStatusClass', () => {
  it.each([
    [200, '2xx'],
    [204, '2xx'],
    [301, '3xx'],
    [404, '4xx'],
    [503, '5xx'],
    [undefined, 'none'],
    [0, 'none'],
  ] as const)('%s → %s', (status, expected) => {
    expect(toStatusClass(status)).toBe(expected);
  });
});

describe('classifyApiFailure', () => {
  it('sin respuesta es network', () => {
    expect(
      classifyApiFailure(
        new AxiosError(
          'Network Error',
          AxiosError.ERR_NETWORK,
          requestConfig(),
        ),
      ),
    ).toBe('network');
  });

  it('ECONNABORTED por el timeout de axios y ETIMEDOUT son timeout', () => {
    expect(
      classifyApiFailure(
        new AxiosError('timeout of 1000ms exceeded', 'ECONNABORTED'),
      ),
    ).toBe('timeout');
    expect(classifyApiFailure(new AxiosError('timeout', 'ETIMEDOUT'))).toBe(
      'timeout',
    );
  });

  it('una cancelación o un aborto del navegador es cancelled', () => {
    expect(classifyApiFailure(new CanceledError())).toBe('cancelled');
    expect(
      classifyApiFailure(new AxiosError('Request aborted', 'ECONNABORTED')),
    ).toBe('cancelled');
  });

  it.each([400, 401, 403, 404, 422, 499])('HTTP %d es client', (status) => {
    expect(classifyApiFailure(httpError(status))).toBe('client');
  });

  it.each([500, 502, 503, 599])('HTTP %d es server', (status) => {
    expect(classifyApiFailure(httpError(status))).toBe('server');
  });
});

describe('buildApiRequestRecord', () => {
  it('registra exclusivamente los campos permitidos', () => {
    expect(
      buildApiRequestRecord({
        method: 'post',
        url: '/api/v1/documents/signatures?draft=1',
        status: 201,
        durationMs: 1840.4,
      }),
    ).toEqual({
      method: 'POST',
      route: '/api/v1/documents/signatures',
      status_class: '2xx',
      duration_ms: 1840,
      outcome: 'success',
    });
  });

  it('en un fallo agrega la categoría', () => {
    expect(
      buildApiRequestRecord({
        method: 'get',
        url: '/api/v1/document/6f1c',
        status: 503,
        durationMs: 12,
        failure: 'server',
      }),
    ).toMatchObject({ outcome: 'failure', failure_category: 'server' });
  });

  it('agrupa métodos desconocidos', () => {
    expect(
      buildApiRequestRecord({
        method: 'purge',
        url: '/api/v1/x',
        status: 200,
        durationMs: 1,
      })?.method,
    ).toBe('OTHER');
  });
});

describe('annotateRequestSpan', () => {
  beforeEach(() => {
    Sentry.init({
      dsn: 'https://public@glitchtip.example.com/1',
      tracesSampleRate: 1,
      defaultIntegrations: false,
      transport: (options: Parameters<typeof Sentry.createTransport>[0]) =>
        Sentry.createTransport(options, async () => ({ statusCode: 200 })),
    });
  });

  afterEach(async () => {
    await Sentry.close();
  });

  it('renombra el span del SDK y le quita la URL completa', () => {
    const span = Sentry.startInactiveSpan({
      name: 'GET /api/v1/document/6f1c',
    });
    span.setAttribute(
      'url.full',
      'https://app.test/api/api/v1/document/6f1c?x=1',
    );
    trackRequestSpan(span);

    annotateRequestSpan(
      {
        method: 'GET',
        route: '/api/v1/document/:id',
        status_class: '5xx',
        duration_ms: 10,
        outcome: 'failure',
        failure_category: 'server',
      },
      { __sentry_xhr_span_id__: span.spanContext().spanId },
    );

    const json = Sentry.spanToJSON(span);
    expect(json.name).toBe('GET /api/v1/document/:id');
    expect(json.attributes).toMatchObject({
      'api.route': '/api/v1/document/:id',
      'api.outcome': 'failure',
      'api.failure_category': 'server',
      'http.status_class': '5xx',
    });
    expect(json.attributes['url.full']).toBeUndefined();
  });
});

/**
 * El cableado real: `apiClient` con un adapter simulado y un cliente del SDK sin red. Se mira lo
 * que el SDK enviaría (eventos) y los breadcrumbs que deja.
 */
describe('apiClient instrumentado', () => {
  let events: ErrorEvent[];
  let breadcrumbs: Breadcrumb[];
  const originalAdapter = apiClient.defaults.adapter;
  let infoLog: jest.SpiedFunction<typeof Sentry.logger.info>;
  let warningLog: jest.SpiedFunction<typeof Sentry.logger.warn>;
  let errorLog: jest.SpiedFunction<typeof Sentry.logger.error>;

  beforeEach(() => {
    events = [];
    breadcrumbs = [];
    infoLog = jest.spyOn(Sentry.logger, 'info').mockImplementation();
    warningLog = jest.spyOn(Sentry.logger, 'warn').mockImplementation();
    errorLog = jest.spyOn(Sentry.logger, 'error').mockImplementation();
    Sentry.init({
      dsn: 'https://public@glitchtip.example.com/1',
      defaultIntegrations: false,
      transport: (options: Parameters<typeof Sentry.createTransport>[0]) =>
        Sentry.createTransport(options, async () => ({ statusCode: 200 })),
      beforeBreadcrumb: (breadcrumb) => {
        breadcrumbs.push(breadcrumb);
        return breadcrumb;
      },
      beforeSend: (event, hint) => {
        const kept = filterApiErrorEvent(event, hint);
        if (kept) events.push(kept);
        return null;
      },
    });
  });

  afterEach(async () => {
    apiClient.defaults.adapter = originalAdapter;
    await Sentry.close();
    jest.restoreAllMocks();
  });

  function respondWith(adapter: AxiosAdapter) {
    apiClient.defaults.adapter = adapter;
  }

  it('un éxito deja un breadcrumb con sólo el registro', async () => {
    respondWith(async (config) => ({
      data: { email: 'ana@example.com' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }));

    await apiClient.get('/api/v1/document/6f1c2a90-1b2c?search=ana');

    const crumb = breadcrumbs.find((b) => b.category === 'api.request');
    expect(crumb?.data).toEqual({
      method: 'GET',
      route: '/api/v1/document/:id',
      status_class: '2xx',
      duration_ms: expect.any(Number),
      outcome: 'success',
    });
    expect(JSON.stringify(breadcrumbs)).not.toMatch(/ana|6f1c|Bearer/);
    expect(infoLog).toHaveBeenCalledWith('API request succeeded', {
      method: 'GET',
      route: '/api/v1/document/:id',
      status_class: '2xx',
      duration_ms: expect.any(Number),
      outcome: 'success',
    });
    await Sentry.flush();
    expect(events).toEqual([]);
  });

  it('un 500 se envía clasificado, agrupado por ruta y sin el error HTTP', async () => {
    respondWith(async (config) => {
      throw httpError(500, config);
    });

    await expect(apiClient.get('/api/v1/document/6f1c')).rejects.toThrow();
    await Sentry.flush();

    expect(events).toHaveLength(1);
    const [event] = events;
    expect(event.message).toBe('API server: GET /api/v1/document/:id');
    expect(event.fingerprint).toEqual([
      'api-request',
      'GET',
      '/api/v1/document/:id',
      'server',
    ]);
    expect(event.tags).toEqual({
      'api.method': 'GET',
      'api.route': '/api/v1/document/:id',
      'api.outcome': 'failure',
      'http.status_class': '5xx',
      'api.failure_category': 'server',
    });
    expect(event.exception).toBeUndefined();
    expect(event.extra).toBeUndefined();
    expect(JSON.stringify(event)).not.toMatch(/ana@example|Bearer|6f1c/);
    expect(errorLog).toHaveBeenCalledWith('API request failed', {
      method: 'GET',
      route: '/api/v1/document/:id',
      status_class: '5xx',
      duration_ms: expect.any(Number),
      outcome: 'failure',
      failure_category: 'server',
    });
  });

  it.each([400, 401, 403, 404, 422])(
    'un %d se reporta como advertencia de cliente',
    async (status) => {
      respondWith(async (config) => {
        throw httpError(status, config);
      });

      await expect(apiClient.get('/api/v1/document/6f1c')).rejects.toThrow();
      await Sentry.flush();

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        message: 'API client: GET /api/v1/document/:id',
        level: 'warning',
        fingerprint: [
          'api-request',
          'GET',
          '/api/v1/document/:id',
          'client',
        ],
        tags: {
          'api.method': 'GET',
          'api.route': '/api/v1/document/:id',
          'api.outcome': 'failure',
          'http.status_class': '4xx',
          'api.failure_category': 'client',
        },
      });
      expect(warningLog).toHaveBeenCalledWith(
        'API request completed with an error response',
        expect.objectContaining({
          status_class: '4xx',
          outcome: 'failure',
          failure_category: 'client',
        }),
      );
      expect(
        breadcrumbs.find((b) => b.category === 'api.request')?.data,
      ).toMatchObject({ outcome: 'failure', failure_category: 'client' });
    },
  );

  it('una cancelación se clasifica pero no se reporta', async () => {
    respondWith(async (config) => {
      // En ejecución `CanceledError(message, config, request)`; los tipos heredan la firma de
      // `AxiosError`, así que la config se asigna aparte.
      throw Object.assign(new CanceledError(), { config });
    });

    await expect(apiClient.get('/api/v1/document')).rejects.toThrow();
    await Sentry.flush();

    expect(events).toEqual([]);
    expect(
      breadcrumbs.find((b) => b.category === 'api.request')?.data,
    ).toMatchObject({ failure_category: 'cancelled', status_class: 'none' });
  });

  it('el AxiosError 4xx que nadie atrapa no se duplica como excepción no controlada', async () => {
    const error = httpError(404);
    recordApiError(error);

    Sentry.captureException(error, {
      mechanism: { type: 'onunhandledrejection', handled: false },
    });
    await Sentry.flush();

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      message: 'API client: GET /api/v1/document/:id',
      fingerprint: ['api-request', 'GET', '/api/v1/document/:id', 'client'],
    });
  });

  it('el evento de API sale sin la página, la URL ni los breadcrumbs de navegación', () => {
    const event = filterApiErrorEvent(
      {
        type: undefined,
        message: 'API server: GET /api/v1/document/:id',
        fingerprint: ['api-request', 'GET', '/api/v1/document/:id', 'server'],
        transaction: '/public/documents/6f1c',
        request: { url: 'https://app.test/public/documents/6f1c?token=x' },
        breadcrumbs: [
          { category: 'navigation', data: { from: '/join?token=x' } },
          { category: 'api.request', data: { route: '/api/v1/document/:id' } },
        ],
      },
      undefined,
    );

    expect(event?.request).toBeUndefined();
    expect(event?.transaction).toBeUndefined();
    expect(event?.breadcrumbs?.map((b) => b.category)).toEqual(['api.request']);
  });

  it('un 500 sin atrapar no cuenta dos veces', async () => {
    respondWith(async (config) => {
      throw httpError(500, config);
    });

    const error = await apiClient.get('/api/v1/document').catch((e) => e);
    Sentry.captureException(error);
    await Sentry.flush();

    expect(events).toHaveLength(1);
    expect(events[0].message).toBe('API server: GET /api/v1/document');
  });
});
