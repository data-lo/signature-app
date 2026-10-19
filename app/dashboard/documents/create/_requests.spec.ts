import * as Sentry from '@sentry/nextjs';
import type { Event } from '@sentry/nextjs';

import apiClient from '@/lib/axios';
import {
  scrubUploadTransaction,
  uploadAwareTracesSampler,
} from '@/lib/observability/upload-metrics';
import { createDocumentSignaturesRequest } from './_requests';

jest.mock('@/lib/axios', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

const mockedPost = apiClient.post as jest.Mock;

const baseRequest = {
  file: new File(['%PDF'], 'contrato.pdf', { type: 'application/pdf' }),
  documentData: {
    fileName: 'contrato.pdf',
    requiresApproval: false,
    isSequential: true,
    signatureType: 'SIMPLE' as const,
    isIndexable: true,
  },
  collaborators: [],
  requiresDifferentSignatures: 'SIMPLE' as const,
};

describe('createDocumentSignaturesRequest', () => {
  beforeEach(() => {
    mockedPost.mockReset();
    mockedPost.mockResolvedValue({ data: { data: { id: 'doc-1' } } });
  });

  it('informa el avance de la subida en porcentaje entero', async () => {
    const onUploadProgress = jest.fn();

    await createDocumentSignaturesRequest({ ...baseRequest, onUploadProgress });

    const config = mockedPost.mock.calls[0][2];
    config.onUploadProgress({ loaded: 3 * 1024 * 1024, total: 12 * 1024 * 1024 });
    config.onUploadProgress({ loaded: 12 * 1024 * 1024, total: 12 * 1024 * 1024 });

    expect(onUploadProgress).toHaveBeenNthCalledWith(1, 25);
    expect(onUploadProgress).toHaveBeenNthCalledWith(2, 100);
  });

  it('sin total conocido no informa porcentaje', async () => {
    const onUploadProgress = jest.fn();

    await createDocumentSignaturesRequest({ ...baseRequest, onUploadProgress });
    mockedPost.mock.calls[0][2].onUploadProgress({ loaded: 100, total: undefined });

    expect(onUploadProgress).not.toHaveBeenCalled();
  });

  it('sin callback no registra seguimiento de la subida', async () => {
    await createDocumentSignaturesRequest(baseRequest);

    expect(mockedPost.mock.calls[0][2].onUploadProgress).toBeUndefined();
  });

  it('manda el archivo en el multipart y devuelve el documento creado', async () => {
    await expect(createDocumentSignaturesRequest(baseRequest)).resolves.toEqual({
      id: 'doc-1',
    });

    const [url, formData] = mockedPost.mock.calls[0];
    expect(url).toBe('/api/v1/documents/signatures');
    expect((formData as FormData).get('file')).toBeInstanceOf(File);
  });

  /**
   * Historia "Medir rendimiento y fallos de carga de documentos": la carga se mide con una sola
   * señal al terminar, contra un cliente real del SDK (sin red) con la limpieza de producción.
   */
  describe('métricas de la carga', () => {
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

    const request = {
      ...baseRequest,
      file: new File([new Uint8Array(6 * 1024 * 1024)], 'Contrato ana@example.com.pdf', {
        type: 'application/pdf',
      }),
      documentData: {
        ...baseRequest.documentData,
        fileName: 'Contrato ana@example.com.pdf',
        reviewerUserId: 'user-6f1c',
      },
      collaborators: [
        {
          source: 'MANUAL' as const,
          collaboratorType: 'SIGNER' as const,
          firstName: 'Ana',
          lastName: 'López',
          email: 'ana@example.com',
          addToDirectory: false,
          orderIndex: 0,
        },
      ],
    };

    it('el avance de la subida mueve la barra pero emite una sola señal', async () => {
      const onUploadProgress = jest.fn();
      mockedPost.mockImplementation(async (_url, _body, config) => {
        for (const loaded of [1, 2, 3, 4, 5, 6]) {
          config.onUploadProgress({ loaded: loaded * 1024 * 1024, total: 6 * 1024 * 1024 });
        }
        return { data: { data: { id: 'doc-6f1c' } } };
      });

      await expect(
        createDocumentSignaturesRequest({ ...request, onUploadProgress }),
      ).resolves.toEqual({ id: 'doc-6f1c' });
      await Sentry.flush();

      expect(onUploadProgress).toHaveBeenCalledTimes(6);
      expect(onUploadProgress).toHaveBeenLastCalledWith(100);
      expect(sent).toHaveLength(1);
      expect(sent[0].transaction).toBe('document_upload:5_to_10_mb');
      expect(sent[0].tags).toEqual({
        operation: 'document_upload',
        outcome: 'success',
        file_size_bucket: '5_to_10_mb',
        has_collaborators: 'true',
        signature_mode: 'simple',
      });
    });

    it('ningún dato del archivo, del documento ni de los firmantes viaja', async () => {
      mockedPost.mockRejectedValue(
        Object.assign(new Error('Request failed with status code 500'), {
          isAxiosError: true,
          response: { status: 500, data: { documentId: 'doc-6f1c' } },
        }),
      );

      await expect(createDocumentSignaturesRequest(request)).rejects.toThrow();
      await Sentry.flush();

      expect(sent).toHaveLength(1);
      expect(sent[0].contexts?.trace?.op).toBe('document.upload.server');
      expect(JSON.stringify(sent[0])).not.toMatch(
        /Contrato|ana@example|López|user-6f1c|doc-6f1c|application\/pdf|6291456/,
      );
    });
  });
});
