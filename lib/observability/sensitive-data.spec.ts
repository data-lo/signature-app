import * as Sentry from '@sentry/nextjs';
import type { ErrorEvent } from '@sentry/nextjs';
import { AxiosError, AxiosHeaders } from 'axios';

import { buildSentryOptions } from '@/lib/sentry/sentry-options';
import {
  isSensitiveKey,
  REDACTED,
  redactEvent,
  redactSensitiveText,
  redactValue,
  scrubBreadcrumb,
} from './sensitive-data';

/** Un `AxiosError` de login como lo arma axios: con la config, el cuerpo enviado y la respuesta. */
function loginError() {
  const config = {
    method: 'post',
    url: '/api/v1/auth/login',
    baseURL: '/api',
    headers: new AxiosHeaders({
      Authorization: 'Bearer eyJhbGciOi.eyJzdWIiOi.firma',
    }),
    data: JSON.stringify({ email: 'ana@example.com', password: 'S3creta!' }),
  };
  return new AxiosError(
    'Request failed with status code 401',
    'ERR_BAD_REQUEST',
    config,
    {},
    {
      status: 401,
      statusText: 'Unauthorized',
      headers: { 'set-cookie': ['token=eyJx.eyJy.z'] },
      config,
      data: {
        message: 'Credenciales inválidas para ana@example.com',
        curp: 'LOPA800101MDFPRN09',
      },
    },
  );
}

describe('redactSensitiveText', () => {
  it.each([
    ['Bearer eyJhbGciOi.eyJzdWIiOi.abc', `Bearer ${REDACTED}`],
    ['token eyJhbGciOi.eyJzdWIiOi.abc', 'token [jwt]'],
    ['escribe a ana.lopez+1@example.com.mx', 'escribe a [correo]'],
    ['CURP LOPA800101MDFPRN09', 'CURP [curp]'],
    ['RFC LOPA800101AB1', 'RFC [rfc]'],
    ['/join?token=abc123&x=1', `/join?token=${REDACTED}&x=${REDACTED}`],
    ['tu código es 482913', 'tu código es [número]'],
    ['/sign/q3VbX7f0_Lr9-ZtKp2NcWm4YhA8sDe1', `/sign/${REDACTED}`],
    [
      'GET /api/v1/public/signing-sessions/q3VbX7f0_Lr9-ZtKp',
      `GET /api/v1/public/signing-sessions/${REDACTED}`,
    ],
    [
      '/public/documents/doc-1/sign?x=1',
      `/public/documents/doc-1/sign?x=${REDACTED}`,
    ],
  ])('%s → %s', (input, expected) => {
    expect(redactSensitiveText(input)).toBe(expected);
  });

  it('deja intacto el texto sin datos sensibles', () => {
    expect(redactSensitiveText('falló crear el contacto (500)')).toBe(
      'falló crear el contacto (500)',
    );
  });
});

describe('isSensitiveKey', () => {
  it.each([
    'Authorization',
    'set-cookie',
    'password',
    'otp',
    'rfc',
    'curp',
    'email',
    'data',
    'responseBody',
    'config',
    'file',
    'pdf',
    'certificate',
    'signature',
  ])('%s es sensible', (key) => {
    expect(isSensitiveKey(key)).toBe(true);
  });

  it.each([
    'status',
    'status_code',
    'error_code',
    'method',
    'route',
    'duration_ms',
  ])('%s no es sensible', (key) => {
    expect(isSensitiveKey(key)).toBe(false);
  });
});

describe('redactValue', () => {
  it('quita campos sensibles, redacta textos y reduce un Error a su nombre', () => {
    expect(
      redactValue({
        status: 500,
        data: { email: 'ana@example.com' },
        url: '/join?token=x',
        nested: { password: 'x', note: 'para ana@example.com' },
        error: loginError(),
      }),
    ).toEqual({
      status: 500,
      data: REDACTED,
      url: `/join?token=${REDACTED}`,
      nested: { password: REDACTED, note: 'para [correo]' },
      error: { name: 'AxiosError' },
    });
  });

  it('corta lo que está demasiado hondo', () => {
    expect(redactValue({ a: { b: { c: { d: { e: 'x' } } } } })).toEqual({
      a: { b: { c: { d: REDACTED } } },
    });
  });
});

describe('scrubBreadcrumb', () => {
  it('a los de consola les quita los argumentos', () => {
    const breadcrumb = scrubBreadcrumb({
      category: 'console',
      level: 'error',
      message: '[login] falló para ana@example.com',
      data: { arguments: ['[login]', loginError()], logger: 'console' },
    });

    expect(breadcrumb).toEqual({
      category: 'console',
      level: 'error',
      message: '[login] falló para [correo]',
      data: { logger: 'console' },
    });
  });

  it('a los de navegación y fetch les redacta la query', () => {
    expect(
      scrubBreadcrumb({
        category: 'navigation',
        data: { from: '/join?token=abc', to: '/signup' },
      }).data,
    ).toEqual({ from: `/join?token=${REDACTED}`, to: '/signup' });
  });
});

describe('redactEvent', () => {
  it('redacta mensajes, excepciones, breadcrumbs y extra', () => {
    const event = redactEvent({
      type: undefined,
      message: 'OTP 482913 enviado a ana@example.com',
      exception: {
        values: [
          { type: 'Error', value: 'El correo ana@example.com ya existe' },
        ],
      },
      breadcrumbs: [
        { category: 'console', data: { arguments: [{ password: 'x' }] } },
      ],
      extra: { body: { rfc: 'LOPA800101AB1' }, status: 409 },
    } as ErrorEvent);

    expect(event.message).toBe('OTP [número] enviado a [correo]');
    expect(event.exception?.values?.[0].value).toBe(
      'El correo [correo] ya existe',
    );
    expect(event.exception?.values?.[0].type).toBe('Error');
    expect(event.breadcrumbs?.[0].data).toEqual({});
    expect(event.extra).toEqual({ body: REDACTED, status: 409 });
  });
});

/**
 * Contra el SDK real, con y sin las opciones de producción (`buildSentryOptions`): lo que de
 * verdad saldría si el código volviera a imprimir datos crudos.
 *
 * En Jest el SDK no puede envolver `console` (la consola de Jest no lo permite), así que el
 * breadcrumb se arma como lo arma su integración de consola —`category: 'console'`, los
 * argumentos crudos en `data.arguments` y el mensaje unido— y pasa por la misma normalización y
 * por `beforeBreadcrumb`.
 *
 * El control sin barreras muestra qué se fugaba: la normalización del SDK (profundidad 3) reduce
 * los objetos anidados a `"[Object]"`, pero los valores planos —el `responseBody` de texto de las
 * descargas de XML, una URL con token, un mensaje con un correo— llegan tal cual.
 */
describe('segunda barrera en el SDK', () => {
  /** Lo que imprimían las descargas de XML y los hooks antes de esta historia. */
  const consoleArgs = (): unknown[] => [
    '[XML canónico] El backend rechazó la descarga',
    {
      url: '/api/v1/document/public/6f1c/xml?token=abc123',
      status: 404,
      responseBody: '{"message":"Sin constancia para ana@example.com"}',
    },
    loginError(),
  ];

  async function send(withBarriers: boolean): Promise<string> {
    const sent: ErrorEvent[] = [];
    const options = buildSentryOptions();
    Sentry.init({
      ...(withBarriers ? options : {}),
      dsn: 'https://public@glitchtip.example.com/1',
      enabled: true,
      defaultIntegrations: false,
      transport: (
        transportOptions: Parameters<typeof Sentry.createTransport>[0],
      ) =>
        Sentry.createTransport(transportOptions, async () => ({
          statusCode: 200,
        })),
      beforeSend: (event) => {
        sent.push(withBarriers ? options.beforeSend(event) : event);
        return null;
      },
    });

    const args = consoleArgs();
    Sentry.addBreadcrumb(
      {
        category: 'console',
        level: 'error',
        message: args.map(String).join(' '),
        data: { arguments: args, logger: 'console' },
      },
      { input: args, level: 'error' },
    );
    Sentry.captureException(
      new Error('El correo ana@example.com ya está registrado'),
    );
    await Sentry.flush();
    await Sentry.close();

    expect(sent).toHaveLength(1);
    return JSON.stringify(sent[0]);
  }

  const LEAK = /ana@example|token=abc123|Sin constancia/;

  it('control: sin barreras, los valores planos llegan a GlitchTip', async () => {
    expect(await send(false)).toMatch(LEAK);
  });

  it('con las barreras no sale ni el cuerpo, ni el token, ni el correo', async () => {
    const payload = await send(true);

    expect(payload).not.toMatch(LEAK);
    expect(payload).not.toMatch(/S3creta|eyJ|LOPA800101|Authorization/);
    const event = JSON.parse(payload) as ErrorEvent;
    expect(event.breadcrumbs?.[0]).toMatchObject({
      category: 'console',
      data: { logger: 'console' },
    });
    expect(event.exception?.values?.[0].value).toBe(
      'El correo [correo] ya está registrado',
    );
  });
});
