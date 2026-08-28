/**
 * @jest-environment jsdom
 */
import {
  CanonicalXmlDownloadError,
  downloadCanonicalXml,
} from './download-canonical-xml';

const URL_ARTEFACTO = '/api/document/public/doc-1/seal/canonical';
const NOMBRE = 'cadena-canonica-doc-1.xml';

/** Lo que responde el backend: la cadena canónica envuelta en XML (ver `seal-artifacts.ts`). */
const XML_VALIDO = `<?xml version="1.0" encoding="UTF-8"?>
<canonicalPayload documentId="doc-1" signatureHash="abc" hashAlgorithm="sha256">v1||7:doc-123|12:JOSÉ PÉREZ</canonicalPayload>
`;

describe('downloadCanonicalXml', () => {
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

  function givenResponse(init: {
    ok?: boolean;
    status?: number;
    body?: string;
  }) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: init.ok ?? true,
      status: init.status ?? 200,
      text: async () => init.body ?? '',
    }) as unknown as typeof fetch;
  }

  it('guarda el XML con el nombre pedido cuando la respuesta es válida', async () => {
    givenResponse({ body: XML_VALIDO });

    await downloadCanonicalXml(URL_ARTEFACTO, NOMBRE);

    expect(global.fetch).toHaveBeenCalledWith(URL_ARTEFACTO, {
      headers: { Accept: 'application/xml' },
    });
    expect(click).toHaveBeenCalledWith(NOMBRE, 'blob:fake');
    // El objeto URL se libera siempre: si no, el blob queda retenido en memoria toda la sesión.
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake');
  });

  /**
   * El caso que motiva no usar un `<a href download>`: con un enlace, el cuerpo del 404 se habría
   * guardado como si fuera el archivo.
   */
  it('no descarga nada si el documento no tiene cadena canónica (404)', async () => {
    givenResponse({
      ok: false,
      status: 404,
      body: '{"message":"La constancia del documento no incluye la cadena canónica"}',
    });

    await expect(downloadCanonicalXml(URL_ARTEFACTO, NOMBRE)).rejects.toThrow(
      CanonicalXmlDownloadError,
    );
    expect(click).not.toHaveBeenCalled();
  });

  it('no descarga nada si el servidor falla', async () => {
    givenResponse({ ok: false, status: 500, body: 'boom' });

    await expect(downloadCanonicalXml(URL_ARTEFACTO, NOMBRE)).rejects.toThrow(
      CanonicalXmlDownloadError,
    );
    expect(click).not.toHaveBeenCalled();
  });

  it('no descarga un archivo vacío', async () => {
    givenResponse({ body: '   ' });

    await expect(downloadCanonicalXml(URL_ARTEFACTO, NOMBRE)).rejects.toThrow(
      CanonicalXmlDownloadError,
    );
    expect(click).not.toHaveBeenCalled();
  });

  /**
   * Criterio de aceptación: si el contenido no es XML válido, se avisa y no se entrega un archivo
   * corrupto. Se comprueba parseando de verdad, no mirando cómo empieza la cadena.
   */
  it('no descarga contenido que no sea XML válido', async () => {
    givenResponse({ body: '<canonicalPayload>sin cerrar' });

    await expect(downloadCanonicalXml(URL_ARTEFACTO, NOMBRE)).rejects.toThrow(
      CanonicalXmlDownloadError,
    );
    expect(click).not.toHaveBeenCalled();
  });

  it('no descarga nada si la red falla', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof fetch;

    await expect(downloadCanonicalXml(URL_ARTEFACTO, NOMBRE)).rejects.toThrow(
      CanonicalXmlDownloadError,
    );
    expect(click).not.toHaveBeenCalled();
  });
});
