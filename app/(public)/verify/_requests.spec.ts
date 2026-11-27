// El cliente se crea al importar `_requests`, antes de que corra el cuerpo de este archivo: por eso
// el mock vive dentro de la fábrica y se recupera de `axios.create` más abajo.
jest.mock('axios', () => {
  const actual = jest.requireActual('axios');
  const client = { post: jest.fn() };
  return {
    __esModule: true,
    ...actual,
    default: { ...actual.default, create: jest.fn(() => client) },
  };
});

import axios from 'axios';

import {
  VERIFY_DOCUMENT_FILE_FIELD,
  VERIFY_DOCUMENT_PATH,
  verifyDocumentRequest,
} from './_requests';

const post = (axios.create as jest.Mock).mock.results[0].value
  .post as jest.Mock;

describe('verifyDocumentRequest', () => {
  const xml = new File(['<documentAudit />'], 'auditoria.xml', {
    type: 'application/xml',
  });

  beforeEach(() => {
    post.mockReset();
    post.mockResolvedValue({ data: { data: { status: 'VALID' } } });
  });

  it('usa un cliente propio contra /api, sin el token ni las cabeceras de cuenta', () => {
    expect(axios.create).toHaveBeenCalledWith({ baseURL: '/api' });
  });

  it('envía exclusivamente el archivo como multipart/form-data', async () => {
    await verifyDocumentRequest(xml);

    expect(post).toHaveBeenCalledTimes(1);
    const [path, body, config] = post.mock.calls[0];
    expect(path).toBe(VERIFY_DOCUMENT_PATH);
    expect(body).toBeInstanceOf(FormData);
    const entries = Array.from((body as FormData).entries());
    expect(entries).toHaveLength(1);
    expect(entries[0][0]).toBe(VERIFY_DOCUMENT_FILE_FIELD);
    expect(entries[0][1]).toBeInstanceOf(File);
    expect((entries[0][1] as File).name).toBe('auditoria.xml');
    // Sin cabeceras propias: el navegador pone el Content-Type con su boundary.
    expect(config).toBeUndefined();
  });

  it('envía también un PDF final', async () => {
    const pdf = new File(['%PDF'], 'contrato.pdf', { type: 'application/pdf' });

    await verifyDocumentRequest(pdf);

    const body = post.mock.calls[0][1] as FormData;
    expect((body.get(VERIFY_DOCUMENT_FILE_FIELD) as File).name).toBe(
      'contrato.pdf',
    );
  });

  it('devuelve el resultado validado del backend', async () => {
    post.mockResolvedValue({
      data: {
        data: {
          status: 'VALID',
          fileType: 'AUDIT_XML',
          document: { id: 'doc-1', fileName: 'contrato.pdf' },
        },
      },
    });

    await expect(verifyDocumentRequest(xml)).resolves.toEqual({
      status: 'VALID',
      fileType: 'AUDIT_XML',
      document: { id: 'doc-1', fileName: 'contrato.pdf' },
    });
  });

  it('falla si la respuesta no tiene la forma esperada', async () => {
    post.mockResolvedValue({ data: { data: { status: 'OK' } } });

    await expect(verifyDocumentRequest(xml)).rejects.toThrow();
  });

  it('propaga el error de red', async () => {
    post.mockRejectedValue(new Error('Network Error'));

    await expect(verifyDocumentRequest(xml)).rejects.toThrow('Network Error');
  });
});
