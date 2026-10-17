import type { ErrorEvent } from '@sentry/nextjs';

import {
  buildSentryOptions,
  PRODUCTION_TRACES_SAMPLE_RATE,
  RELEASE_NAME_PREFIX,
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

  it('quita query y fragmento de la URL', () => {
    const event = scrubSensitiveRequestData(
      errorEvent({ url: 'https://app.example.com/join?token=secreto#paso-2' }),
    );

    expect(event.request?.url).toBe('https://app.example.com/join');
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

  it('no recoge cookies, cuerpos ni encabezados de autorización', () => {
    const { dataCollection } = buildSentryOptions();

    expect(dataCollection.cookies).toBe(false);
    expect(dataCollection.httpBodies).toEqual([]);
    expect(dataCollection.httpHeaders.request.deny).toEqual(
      expect.arrayContaining(['authorization', 'cookie']),
    );
  });

  it('etiqueta ambiente y release desde las variables de build', () => {
    withEnv({
      NEXT_PUBLIC_SENTRY_ENVIRONMENT: 'development',
      NEXT_PUBLIC_GIT_COMMIT_SHA: 'abc123',
      NODE_ENV: 'production',
    });

    expect(buildSentryOptions()).toMatchObject({
      environment: 'development',
      release: `${RELEASE_NAME_PREFIX}abc123`,
    });
  });

  it('sin variables usa NODE_ENV como ambiente y no inventa release', () => {
    withEnv({
      NEXT_PUBLIC_SENTRY_ENVIRONMENT: undefined,
      NEXT_PUBLIC_GIT_COMMIT_SHA: undefined,
      NODE_ENV: 'production',
    });

    expect(buildSentryOptions().environment).toBe('production');
    expect(buildSentryOptions().release).toBeUndefined();
  });

  it('limpia el evento en beforeSend', () => {
    const event = buildSentryOptions().beforeSend(
      errorEvent({ headers: { authorization: 'Bearer jwt' } }),
    );

    expect(event.request?.headers).toEqual({});
  });
});
