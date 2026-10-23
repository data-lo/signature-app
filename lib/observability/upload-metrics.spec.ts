import * as Sentry from '@sentry/nextjs';
import type { Event } from '@sentry/nextjs';
import {
  AxiosError,
  AxiosHeaders,
  type InternalAxiosRequestConfig,
} from 'axios';

import {
  buildUploadSignal,
  classifyUploadFailure,
  fileSizeBucket,
  measureDocumentUpload,
  scrubUploadTransaction,
  shouldCreateSpanForUploadRequest,
  toSignatureMode,
  uploadAwareTracesSampler,
  uploadSignalTags,
} from './upload-metrics';

const MB = 1024 * 1024;

function httpError(status: number) {
  const config: InternalAxiosRequestConfig = { headers: new AxiosHeaders() };
  return new AxiosError(
    `Request failed with status code ${status}`,
    'ERR',
    config,
    {},
    {
      status,
      statusText: '',
      headers: {},
      config,
      data: {},
    },
  );
}

describe('fileSizeBucket', () => {
  it.each([
    [0, 'less_than_1_mb'],
    [1 * MB - 1, 'less_than_1_mb'],
    [1 * MB, '1_to_5_mb'],
    [5 * MB - 1, '1_to_5_mb'],
    [5 * MB, '5_to_10_mb'],
    [10 * MB, '10_to_20_mb'],
    [20 * MB, '10_to_20_mb'],
    [20 * MB + 1, 'greater_than_20_mb'],
  ])('%d bytes → %s', (bytes, bucket) => {
    expect(fileSizeBucket(bytes)).toBe(bucket);
  });
});

describe('classifyUploadFailure', () => {
  it('el timeout de axios y los 408/504 son timeout', () => {
    expect(
      classifyUploadFailure(
        new AxiosError('timeout of 1000ms exceeded', 'ECONNABORTED'),
      ),
    ).toBe('timeout');
    expect(classifyUploadFailure(new AxiosError('x', 'ETIMEDOUT'))).toBe(
      'timeout',
    );
    expect(classifyUploadFailure(httpError(504))).toBe('timeout');
    expect(classifyUploadFailure(httpError(408))).toBe('timeout');
  });

  it('sin respuesta, o abortada por el navegador, es network', () => {
    expect(
      classifyUploadFailure(
        new AxiosError('Network Error', AxiosError.ERR_NETWORK),
      ),
    ).toBe('network');
    expect(
      classifyUploadFailure(new AxiosError('Request aborted', 'ECONNABORTED')),
    ).toBe('network');
    expect(classifyUploadFailure(new TypeError('Failed to fetch'))).toBe(
      'network',
    );
  });

  it.each([400, 401, 402, 403, 413, 415, 422])(
    'HTTP %d es validation',
    (status) => {
      expect(classifyUploadFailure(httpError(status))).toBe('validation');
    },
  );

  it.each([500, 502, 503])('HTTP %d es server', (status) => {
    expect(classifyUploadFailure(httpError(status))).toBe('server');
  });
});

describe('toSignatureMode', () => {
  it('traduce el tipo de firma del documento', () => {
    expect(toSignatureMode('SIMPLE')).toBe('simple');
    expect(toSignatureMode('ADVANCED')).toBe('advanced');
    expect(toSignatureMode('BIOMETRIC')).toBe('biometric');
  });
});

describe('buildUploadSignal', () => {
  const context = {
    fileSizeBytes: 12 * MB,
    hasCollaborators: true,
    signatureMode: 'simple' as const,
  };

  it('un éxito lleva exactamente los campos permitidos', () => {
    expect(buildUploadSignal(context, 12400.4)).toEqual({
      operation: 'document_upload',
      outcome: 'success',
      duration_ms: 12400,
      file_size_bucket: '10_to_20_mb',
      has_collaborators: true,
      signature_mode: 'simple',
    });
  });

  it('un fallo agrega su categoría', () => {
    expect(buildUploadSignal(context, 10, 'timeout')).toMatchObject({
      outcome: 'failure',
      failure_category: 'timeout',
    });
  });
});

describe('uploadSignalTags', () => {
  it('etiqueta las dimensiones, no la duración', () => {
    expect(
      uploadSignalTags({
        'upload.outcome': 'failure',
        'upload.duration_ms': 10,
        'upload.failure_category': 'server',
        'upload.has_collaborators': false,
        'sentry.op': 'document.upload.server',
      }),
    ).toEqual({
      operation: 'document_upload',
      outcome: 'failure',
      failure_category: 'server',
      has_collaborators: 'false',
    });
  });
});

describe('shouldCreateSpanForUploadRequest', () => {
  it('apaga el span automático sólo del endpoint de carga', () => {
    expect(
      shouldCreateSpanForUploadRequest('/api/api/v1/documents/signatures'),
    ).toBe(false);
    expect(
      shouldCreateSpanForUploadRequest(
        'https://app.test/api/api/v1/documents/signatures?x=1',
      ),
    ).toBe(false);
    expect(shouldCreateSpanForUploadRequest('/api/api/v1/document')).toBe(true);
  });
});

describe('uploadAwareTracesSampler', () => {
  const sampler = uploadAwareTracesSampler(0.1);
  const inheritOrSampleWith = (rate: number) => rate;

  it('muestrea siempre las cargas', () => {
    expect(
      sampler({
        attributes: { 'sentry.op': 'document.upload' },
        inheritOrSampleWith,
      }),
    ).toBe(1);
  });

  it('deja igual el resto', () => {
    expect(
      sampler({ attributes: { 'sentry.op': 'pageload' }, inheritOrSampleWith }),
    ).toBe(0.1);
  });
});

describe('scrubUploadTransaction', () => {
  it('a la carga le quita página, breadcrumbs, contexto del dispositivo y tamaños', () => {
    const event = scrubUploadTransaction({
      type: 'transaction',
      contexts: {
        trace: {
          trace_id: 't',
          span_id: 's',
          op: 'document.upload.success',
          data: { 'upload.outcome': 'success' },
        },
        culture: { locale: 'es-MX' },
      },
      request: {
        url: 'https://app.test/dashboard/documents/create',
        headers: { 'User-Agent': 'x' },
      },
      breadcrumbs: [{ category: 'console', message: 'ana@example.com' }],
      user: { id: 'u-1' },
      spans: [
        {
          span_id: 'c',
          trace_id: 't',
          start_timestamp: 0,
          status: 'ok',
          data: {
            'url.full': 'x',
            'http.request.body.size': 12 * MB,
            'http.method': 'POST',
          },
        },
      ],
    } as Event);

    expect(event.request).toBeUndefined();
    expect(event.breadcrumbs).toBeUndefined();
    expect(event.user).toBeUndefined();
    expect(Object.keys(event.contexts ?? {})).toEqual(['trace']);
    expect(event.spans?.[0].data).toEqual({ 'http.method': 'POST' });
    expect(event.tags).toEqual({
      operation: 'document_upload',
      outcome: 'success',
    });
  });

  it('no toca otras transacciones', () => {
    const event = {
      type: 'transaction',
      contexts: { trace: { trace_id: 't', span_id: 's', op: 'pageload' } },
      breadcrumbs: [{ message: 'x' }],
    } as Event;

    expect(scrubUploadTransaction(event).breadcrumbs).toHaveLength(1);
  });
});

/**
 * Contra un cliente real del SDK (sin red), con el mismo muestreo y limpieza que
 * `sentry.client.config.ts`, y las trazas al 0 %: las cargas salen igual.
 */
describe('measureDocumentUpload', () => {
  let sent: Event[];

  beforeEach(() => {
    sent = [];
    Sentry.init({
      dsn: 'https://public@glitchtip.example.com/1',
      tracesSampler: uploadAwareTracesSampler(0),
      traceLifecycle: 'static',
      defaultIntegrations: false,
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

  const context = {
    fileSizeBytes: 12 * MB + 345,
    hasCollaborators: true,
    signatureMode: 'advanced' as const,
  };

  /** Reloj controlado: 0 al empezar y 12 400 ms al terminar. */
  function clock() {
    const times = [0, 12400];
    return () => times.shift() ?? 12400;
  }

  it('un éxito emite una sola transacción con la señal y devuelve lo mismo', async () => {
    const result = { data: { id: 'doc-6f1c' } };

    await expect(
      measureDocumentUpload(context, async () => result, clock()),
    ).resolves.toBe(result);
    await Sentry.flush();

    expect(sent).toHaveLength(1);
    const [event] = sent;
    expect(event.transaction).toBe('document_upload:10_to_20_mb');
    expect(event.contexts?.trace?.op).toBe('document.upload.success');
    expect(event.contexts?.trace?.status).toBe('ok');
    expect(event.tags).toEqual({
      operation: 'document_upload',
      outcome: 'success',
      file_size_bucket: '10_to_20_mb',
      has_collaborators: 'true',
      signature_mode: 'advanced',
    });
    expect(event.contexts?.trace?.data).toMatchObject({
      'upload.duration_ms': 12400,
    });
    expect(JSON.stringify(event)).not.toMatch(/doc-6f1c|12583257/);
  });

  it('un fallo relanza el mismo error y lo clasifica en el op', async () => {
    const error = httpError(422);

    await expect(
      measureDocumentUpload(context, async () => {
        throw error;
      }),
    ).rejects.toBe(error);
    await Sentry.flush();

    expect(sent).toHaveLength(1);
    expect(sent[0].contexts?.trace?.op).toBe('document.upload.validation');
    expect(sent[0].contexts?.trace?.status).toBe('invalid_argument');
    expect(sent[0].tags).toMatchObject({
      outcome: 'failure',
      failure_category: 'validation',
    });
  });

  it('cuelga de la transacción activa, en la misma traza', async () => {
    let parent: Sentry.Span | undefined;
    await Sentry.startSpan(
      {
        name: '/dashboard/documents/create',
        op: 'navigation',
        forceTransaction: true,
      },
      (span) => {
        parent = span;
        return measureDocumentUpload(context, async () => 'ok');
      },
    );
    await Sentry.flush();

    const upload = sent.find((e) =>
      e.contexts?.trace?.op?.startsWith('document.upload'),
    );
    expect(upload?.contexts?.trace?.trace_id).toBe(
      parent?.spanContext().traceId,
    );
    expect(upload?.contexts?.trace?.parent_span_id).toBe(
      parent?.spanContext().spanId,
    );
  });

  it('si registrar falla, la carga sigue igual', async () => {
    const startInactiveSpan = jest
      .spyOn(Sentry, 'startInactiveSpan')
      .mockImplementation(() => {
        throw new Error('sdk roto');
      });

    await expect(
      measureDocumentUpload(context, async () => 'ok'),
    ).resolves.toBe('ok');
    startInactiveSpan.mockRestore();
  });
});
