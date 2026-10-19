import * as Sentry from '@sentry/nextjs';
import {
  AxiosError,
  AxiosHeaders,
  CanceledError,
  type AxiosAdapter,
  type InternalAxiosRequestConfig,
} from 'axios';

import apiClient from '@/lib/axios';
import { BackendRequestError } from '@/lib/server/backend-request';
import {
  buildSafeHttpLog,
  logSafeError,
  logSafeSummary,
  reportSafeHttpLog,
  summarizeError,
} from './safe-log';

/** Todo lo que no puede aparecer en un log: credenciales, PII, cuerpos y la query. */
const SENSITIVE =
  /S3creta|eyJ|Bearer|ana@example|LOPA800101|Credenciales|token=|search=|6f1c2a90/;

function requestConfig(
  overrides: Partial<InternalAxiosRequestConfig> = {},
): InternalAxiosRequestConfig {
  return {
    method: 'post',
    url: '/api/v1/auth/login?token=abc',
    baseURL: '/api',
    headers: new AxiosHeaders({ Authorization: 'Bearer eyJa.eyJb.c' }),
    data: JSON.stringify({ email: 'ana@example.com', password: 'S3creta!' }),
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
      data: {
        message: 'Credenciales inválidas para ana@example.com',
        curp: 'LOPA800101MDFPRN09',
      },
    },
  );
}

/** Cambia `NODE_ENV` durante una prueba (en TS es de sólo lectura). */
function setNodeEnv(value: string) {
  (process.env as Record<string, string>).NODE_ENV = value;
}

const originalNodeEnv = process.env.NODE_ENV;

/**
 * Inicia un cliente real del SDK, sin red, y devuelve los breadcrumbs que va recibiendo (ya
 * pasados por la barrera de `beforeBreadcrumb`, como en producción).
 */
function captureBreadcrumbs(): Sentry.Breadcrumb[] {
  const breadcrumbs: Sentry.Breadcrumb[] = [];
  Sentry.init({
    dsn: 'https://public@glitchtip.example.com/1',
    defaultIntegrations: false,
    transport: (options: Parameters<typeof Sentry.createTransport>[0]) =>
      Sentry.createTransport(options, async () => ({ statusCode: 200 })),
    beforeBreadcrumb: (breadcrumb) => {
      const { timestamp, ...rest } = breadcrumb;
      void timestamp;
      breadcrumbs.push(rest);
      return breadcrumb;
    },
  });
  return breadcrumbs;
}

afterEach(async () => {
  setNodeEnv(originalNodeEnv ?? 'test');
  jest.restoreAllMocks();
  await Sentry.close();
});

describe('summarizeError', () => {
  it('de un AxiosError deja tipo, código, estado, método, ruta y categoría', () => {
    const summary = summarizeError(httpError(401));

    expect(summary).toEqual({
      name: 'AxiosError',
      error_code: 'ERR_BAD_REQUEST',
      status: 401,
      method: 'POST',
      route: '/api/v1/auth/login',
      failure_category: 'client',
    });
    expect(JSON.stringify(summary)).not.toMatch(SENSITIVE);
  });

  it('de una cancelación no inventa estado', () => {
    expect(
      summarizeError(
        Object.assign(new CanceledError(), { config: requestConfig() }),
      ),
    ).toMatchObject({ name: 'CanceledError', failure_category: 'cancelled' });
  });

  it('de cualquier otro error deja el tipo, el estado y el digest, nunca el mensaje', () => {
    expect(
      summarizeError(new BackendRequestError(409, 'Ya existe ana@example.com')),
    ).toEqual({ name: 'BackendRequestError', status: 409 });
    expect(
      summarizeError(
        Object.assign(new Error('render roto'), { digest: 'abc' }),
      ),
    ).toEqual({ name: 'Error', digest: 'abc' });
    expect(summarizeError('texto')).toEqual({ name: 'string' });
  });
});

describe('logSafeError', () => {
  it('en desarrollo imprime sólo el resumen', () => {
    setNodeEnv('development');
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    logSafeError('[login] falló el inicio de sesión', httpError(401));

    expect(consoleError).toHaveBeenCalledWith(
      '[login] falló el inicio de sesión',
      expect.objectContaining({ name: 'AxiosError', status: 401 }),
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toMatch(SENSITIVE);
  });

  it('en producción no imprime nada y deja un breadcrumb con el resumen', () => {
    setNodeEnv('production');
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const breadcrumbs = captureBreadcrumbs();

    logSafeError('[register] falló la creación de cuenta', httpError(500));

    expect(consoleError).not.toHaveBeenCalled();
    expect(breadcrumbs).toEqual([
      {
        category: 'app.error',
        level: 'error',
        message: '[register] falló la creación de cuenta',
        data: expect.objectContaining({
          status: 500,
          failure_category: 'server',
        }),
      },
    ]);
    expect(JSON.stringify(breadcrumbs)).not.toMatch(SENSITIVE);
  });

  it('logSafeSummary registra un resumen armado a mano', () => {
    setNodeEnv('development');
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    logSafeSummary('[XML canónico] El backend rechazó la descarga', {
      name: 'HttpError',
      status: 404,
    });

    expect(consoleError).toHaveBeenCalledWith(
      '[XML canónico] El backend rechazó la descarga',
      { name: 'HttpError', status: 404 },
    );
  });
});

describe('buildSafeHttpLog', () => {
  it('lleva exactamente método, ruta, estado, duración y categoría', () => {
    const config = requestConfig({
      method: 'get',
      url: '/api/v1/document/6f1c2a90-1b2c?search=ana',
    });

    expect(
      buildSafeHttpLog({ config, status: 503, error: httpError(503, config) }),
    ).toEqual({
      method: 'GET',
      route: '/api/v1/document/:id',
      status: 503,
      duration_ms: expect.any(Number),
      failure_category: 'server',
    });
  });

  it('sin respuesta el estado es null', () => {
    const config = requestConfig();
    expect(
      buildSafeHttpLog({
        config,
        status: undefined,
        error: new AxiosError('Network Error', AxiosError.ERR_NETWORK, config),
      }),
    ).toMatchObject({ status: null, failure_category: 'network' });
  });

  it('ignora lo que no va a /api/*', () => {
    expect(
      buildSafeHttpLog({
        config: { url: 'https://minio.example.com/x.pdf' },
        status: 200,
      }),
    ).toBeNull();
  });
});

describe('reportSafeHttpLog', () => {
  const log = {
    method: 'GET',
    route: '/api/v1/document/:id',
    status: 200,
    duration_ms: 12,
  };

  it('en desarrollo, una línea de consola', () => {
    setNodeEnv('development');
    const consoleDebug = jest
      .spyOn(console, 'debug')
      .mockImplementation(() => {});

    reportSafeHttpLog(log);

    expect(consoleDebug).toHaveBeenCalledWith('[API]', log);
  });

  it('en producción, el breadcrumb api.request', () => {
    setNodeEnv('production');
    const breadcrumbs = captureBreadcrumbs();

    reportSafeHttpLog(log);

    expect(breadcrumbs).toEqual([
      { type: 'http', category: 'api.request', level: 'info', data: log },
    ]);
  });
});

/** El cableado real de `lib/axios.ts`, con un adapter simulado. */
describe('apiClient', () => {
  const originalAdapter = apiClient.defaults.adapter;

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
  });

  function respondWith(adapter: AxiosAdapter) {
    apiClient.defaults.adapter = adapter;
  }

  function spyConsole() {
    return (['log', 'debug', 'info', 'warn', 'error'] as const).map((level) =>
      jest.spyOn(console, level).mockImplementation(() => {}),
    );
  }

  it('no imprime response.data en consola', async () => {
    setNodeEnv('development');
    const spies = spyConsole();
    respondWith(async (config) => ({
      data: { email: 'ana@example.com', curp: 'LOPA800101MDFPRN09' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }));

    await apiClient.get('/api/v1/document/6f1c2a90-1b2c?search=ana');

    const calls = spies.flatMap((spy) => spy.mock.calls);
    expect(calls).toContainEqual([
      '[API]',
      expect.objectContaining({ route: '/api/v1/document/:id', status: 200 }),
    ]);
    expect(JSON.stringify(calls)).not.toMatch(SENSITIVE);
  });

  it('no imprime error.response.data ni la config del AxiosError', async () => {
    setNodeEnv('development');
    const spies = spyConsole();
    respondWith(async (config) => {
      throw httpError(409, config);
    });

    await expect(
      apiClient.post('/api/v1/auth/register?token=abc', {
        email: 'ana@example.com',
        password: 'S3creta!',
      }),
    ).rejects.toThrow();

    const calls = spies.flatMap((spy) => spy.mock.calls);
    expect(calls).toContainEqual([
      '[API]',
      expect.objectContaining({
        route: '/api/v1/auth/register',
        status: 409,
        failure_category: 'client',
      }),
    ]);
    expect(JSON.stringify(calls)).not.toMatch(SENSITIVE);
  });

  it('en producción no escribe nada en consola', async () => {
    setNodeEnv('production');
    const spies = spyConsole();
    const breadcrumbs = captureBreadcrumbs();
    respondWith(async (config) => ({
      data: { email: 'ana@example.com' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }));

    await apiClient.get('/api/v1/users/me');

    expect(spies.flatMap((spy) => spy.mock.calls)).toEqual([]);
    expect(breadcrumbs).toEqual([
      expect.objectContaining({
        category: 'api.request',
        // Lo deja `recordApiResponse` (ver `./api-request`): el log seguro sólo va a consola.
        data: expect.objectContaining({
          route: '/api/v1/users/me',
          status_class: '2xx',
        }),
      }),
    ]);
    expect(JSON.stringify(breadcrumbs)).not.toMatch(SENSITIVE);
  });
});
