/**
 * @jest-environment jsdom
 */
import { AuditXmlDownloadError, downloadAuditXml } from './download-audit-xml';

const URL_AUDITORIA = '/api/document/public/doc-1/audit-xml';
const NOMBRE = 'auditoria-doc-1.xml';

const XML_VALIDO = `<?xml version="1.0" encoding="UTF-8"?>
<documentAudit version="1" documentId="doc-1" generatedAt="2026-01-15T10:00:00.000Z">
  <document id="doc-1"><fileName>contrato.pdf</fileName></document>
</documentAudit>
`;

describe('downloadAuditXml', () => {
  let click: jest.Mock;
  let createObjectURL: jest.Mock;
  let revokeObjectURL: jest.Mock;

  beforeEach(() => {
    click = jest.fn();
    createObjectURL = jest.fn().mockReturnValue('blob:fake');
    revokeObjectURL = jest.fn();

    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;

    // Se intercepta el click del enlace que la utilidad crea: en jsdom una descarga real no ocurre.
    jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        click(this.download, this.href);
      });
  });

  afterEach(() => jest.restoreAllMocks());

  function givenResponse(init: { ok?: boolean; status?: number; body?: string }) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: init.ok ?? true,
      status: init.status ?? 200,
      blob: async () =>
        new Blob([init.body ?? ''], { type: 'application/xml' }),
    }) as unknown as typeof fetch;
  }

  it('guarda el XML con el nombre pedido cuando la respuesta es válida', async () => {
    givenResponse({ body: XML_VALIDO });

    await downloadAuditXml(URL_AUDITORIA, NOMBRE);

    expect(global.fetch).toHaveBeenCalledWith(URL_AUDITORIA, {
      headers: { Accept: 'application/xml' },
    });
    expect(click).toHaveBeenCalledWith(NOMBRE, 'blob:fake');
    // Sin revocar, el blob —que lleva los PDFs adentro— se quedaría retenido en memoria.
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake');
  });

  /**
   * El caso que justifica traer la respuesta antes de guardarla: con un `<a href download>` este
   * 404 se guardaría en disco como un `.xml` que en realidad contiene el JSON del error.
   */
  it('no descarga nada si el documento no tiene XML de auditoría', async () => {
    givenResponse({ ok: false, status: 404, body: '{"message":"no existe"}' });

    await expect(downloadAuditXml(URL_AUDITORIA, NOMBRE)).rejects.toThrow(
      AuditXmlDownloadError,
    );
    expect(click).not.toHaveBeenCalled();
  });

  it('avisa con sus palabras cuando al documento le falta evidencia (422)', async () => {
    givenResponse({ ok: false, status: 422 });

    await expect(downloadAuditXml(URL_AUDITORIA, NOMBRE)).rejects.toThrow(
      /le falta evidencia/i,
    );
  });

  it('no culpa al usuario de un fallo del servidor', async () => {
    givenResponse({ ok: false, status: 500 });

    await expect(downloadAuditXml(URL_AUDITORIA, NOMBRE)).rejects.toThrow(
      /inténtalo de nuevo más tarde/i,
    );
    expect(click).not.toHaveBeenCalled();
  });

  it('distingue la falla de conexión de una respuesta de error', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof fetch;

    await expect(downloadAuditXml(URL_AUDITORIA, NOMBRE)).rejects.toThrow(
      /revisa tu conexión/i,
    );
    expect(click).not.toHaveBeenCalled();
  });

  it('no guarda un archivo vacío', async () => {
    givenResponse({ body: '' });

    await expect(downloadAuditXml(URL_AUDITORIA, NOMBRE)).rejects.toThrow(
      /vacío/i,
    );
    expect(click).not.toHaveBeenCalled();
  });
});
