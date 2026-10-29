import type { ErrorEvent } from '@sentry/nextjs';

import {
  buildSentryOptions,
  PRODUCTION_TRACES_SAMPLE_RATE,
  resolveTracesSampleRate,
  scrubSensitiveRequestData,
} from './sentry-options';

function errorEvent(request: ErrorEvent['request']): ErrorEvent {
  return { type: undefined, request };
}

describe('scrubSensitiveRequestData', () => {
  it('quita cookies y encabezados de autorización sin importar mayúsculas', () => {
    const event = scrubSensitiveRequestData(
      errorEvent({
        url: 'https://app.example.com/dashboard',
        cookies: { token: 'jwt' },
        headers: {
          Authorization: 'Bearer jwt',
          cookie: 'token=jwt',
          'Set-Cookie': 'token=jwt',
          'Proxy-Authorization': 'Basic x',
          'user-agent': 'jest',
        },
      }),
    );

    expect(event.request).toEqual({
      url: 'https://app.example.com/dashboard',
      headers: { 'user-agent': 'jest' },
    });
  });

  it('no deja salir el token de /sign/:token en la URL, la transacción ni los spans', () => {
    const token = 'q3VbX7f0_Lr9-ZtKp2NcWm4YhA8sDe1JuGo6BiQk5Rv';
    const event = scrubSensitiveRequestData({
      type: 'transaction',
      transaction: `GET /sign/${token}`,
      request: { url: `https://app.example.com/sign/${token}` },
      contexts: {
        trace: {
          trace_id: 't',
          span_id: 's',
          data: { 'http.target': `/sign/${token}` },
        },
      },
      spans: [
        {
          span_id: 's2',
          trace_id: 't',
          start_timestamp: 0,
          description: `GET /api/api/v1/public/signing-sessions/${token}`,
          data: { url: `/api/api/v1/public/signing-sessions/${token}` },
        },
      ],
    } as unknown as ErrorEvent);

    expect(JSON.stringify(event)).not.toContain(token);
    expect(event.request?.url).toBe('https://app.example.com/sign/[redactado]');
  });

  it('deja intacto un evento sin petición', () => {
    const event = errorEvent(undefined);

    expect(scrubSensitiveRequestData(event)).toBe(event);
  });
});

describe('buildSentryOptions', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  function withEnv(env: Record<string, string | undefined>) {
    process.env = { ...originalEnv, ...env } as NodeJS.ProcessEnv;
  }

  it('lee el DSN de NEXT_PUBLIC_SENTRY_DSN', () => {
    withEnv({ NEXT_PUBLIC_SENTRY_DSN: 'https://key@glitchtip.example.com/1' });

    expect(buildSentryOptions()).toMatchObject({
      dsn: 'https://key@glitchtip.example.com/1',
      enabled: true,
    });
  });

  it('sin DSN deja el SDK deshabilitado', () => {
    withEnv({ NEXT_PUBLIC_SENTRY_DSN: undefined });

    expect(buildSentryOptions().enabled).toBe(false);
  });

  it('muestrea pocas trazas en producción', () => {
    withEnv({ NODE_ENV: 'production' });

    expect(buildSentryOptions().tracesSampleRate).toBe(
      PRODUCTION_TRACES_SAMPLE_RATE,
    );
    expect(PRODUCTION_TRACES_SAMPLE_RATE).toBeLessThanOrEqual(0.1);
  });

  it('la tasa de las trazas sale de resolveTracesSampleRate', () => {
    withEnv({ NODE_ENV: 'production' });
    expect(buildSentryOptions().tracesSampleRate).toBe(
      resolveTracesSampleRate(),
    );

    withEnv({ NODE_ENV: 'development' });
    expect(resolveTracesSampleRate()).toBe(1);
  });

  it('toma ambiente y release de las variables públicas', () => {
    withEnv({
      NODE_ENV: 'production',
      NEXT_PUBLIC_SENTRY_ENVIRONMENT: 'staging',
      NEXT_PUBLIC_SENTRY_RELEASE: 'signature-app@3f2a9c1',
    });

    expect(buildSentryOptions()).toMatchObject({
      environment: 'staging',
      release: 'signature-app@3f2a9c1',
    });
  });

  it('sin variables, el ambiente es NODE_ENV y no hay release', () => {
    withEnv({
      NODE_ENV: 'production',
      NEXT_PUBLIC_SENTRY_ENVIRONMENT: undefined,
      NEXT_PUBLIC_SENTRY_RELEASE: undefined,
    });

    expect(buildSentryOptions().environment).toBe('production');
    expect(buildSentryOptions().release).toBeUndefined();
  });

  it('no recoge cookies, cuerpos ni encabezados de autorización', () => {
    const { dataCollection } = buildSentryOptions();

    expect(dataCollection.cookies).toBe(false);
    expect(dataCollection.httpBodies).toEqual([]);
    expect(dataCollection.httpHeaders.request.deny).toEqual(
      expect.arrayContaining(['authorization', 'cookie']),
    );
  });

  it('limpia el evento en beforeSend', () => {
    const event = buildSentryOptions().beforeSend(
      errorEvent({ headers: { authorization: 'Bearer jwt' } }),
    );

    expect(event.request?.headers).toEqual({});
  });
});
