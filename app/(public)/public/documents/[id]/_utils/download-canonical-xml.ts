/**
 * Descarga el XML canónico del sello, consultándolo en el momento del clic.
 *
 * **Por qué se hace con `fetch` y no con un `<a href download>`**, que es como estaba. Un enlace
 * directo guarda en disco lo que sea que responda el servidor: si el documento no tiene cadena
 * canónica, el backend contesta un 404 con un cuerpo JSON de error y el navegador lo guarda igual,
 * produciendo un archivo `.xml` que en realidad contiene `{"message":"..."}`. Es el archivo
 * corrupto que hay que evitar, y con un enlace no hay forma de mirar la respuesta antes de
 * guardarla. Trayéndola primero se puede comprobar y, si algo falla, no se descarga nada.
 *
 * El contenido llega ya envuelto en XML por el backend (ver `seal-artifacts.ts`): aquí no se
 * construye ni se reescribe, sólo se comprueba y se guarda.
 */

import { saveBlobAsFile } from './save-blob-as-file';

/** Lo que el llamador muestra al usuario cuando la descarga no se puede completar. */
export class CanonicalXmlDownloadError extends Error {}

export async function downloadCanonicalXml(
  url: string,
  fileName: string,
): Promise<void> {
  let response: Response;

  try {
    response = await fetch(url, { headers: { Accept: 'application/xml' } });
  } catch {
    throw new CanonicalXmlDownloadError(
      'No se pudo conectar para obtener el XML canónico. Revisa tu conexión e inténtalo de nuevo.',
    );
  }

  if (!response.ok) {
    /**
     * 404 es el caso esperado y frecuente: el documento no tiene constancia, o la tiene sin cadena
     * canónica. Se distingue del resto para no culpar al usuario de un fallo del servidor.
     */
    throw new CanonicalXmlDownloadError(
      response.status === 404
        ? 'Este documento no tiene XML canónico disponible.'
        : 'No se pudo obtener el XML canónico. Inténtalo de nuevo más tarde.',
    );
  }

  const xml = await response.text();

  if (!xml.trim()) {
    throw new CanonicalXmlDownloadError(
      'El XML canónico llegó vacío, así que no se descargó nada.',
    );
  }

  assertParsesAsXml(xml);

  save(xml, fileName);
}

/**
 * Comprueba que lo recibido sea XML de verdad, parseándolo con el propio motor del navegador en
 * vez de mirar cómo empieza la cadena. Es lo que impide entregar un `.xml` que después no abre:
 * si `DOMParser` no puede con él, tampoco podrá el visor de quien lo descargue.
 */
function assertParsesAsXml(xml: string): void {
  const parsed = new DOMParser().parseFromString(xml, 'application/xml');

  if (parsed.querySelector('parsererror')) {
    throw new CanonicalXmlDownloadError(
      'El XML canónico del documento no es válido, así que no se descargó.',
    );
  }
}

function save(xml: string, fileName: string): void {
  // `charset=utf-8` en el blob: la cadena canónica lleva acentos (el nombre del firmante) y sin
  // declararlo el archivo se abre con los caracteres rotos en algunos visores.
  saveBlobAsFile(
    new Blob([xml], { type: 'application/xml;charset=utf-8' }),
    fileName,
  );
}
