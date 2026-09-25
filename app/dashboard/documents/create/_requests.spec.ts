import apiClient from '@/lib/axios';
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
});
