import { saveBlobAsFile } from './save-blob-as-file';

/**
 * Descarga el XML de auditoría del documento, que el backend arma en el momento del clic.
 *
 * **Por qué se pide con `fetch` y no con un `<a href download>`**: por lo mismo que el XML
 * canónico (ver `download-canonical-xml.ts`). Un enlace directo guarda lo que sea que responda el
 * servidor, incluido el JSON de un 404 o un 422 renombrado a `.xml`. Trayendo la respuesta
 * primero se puede comprobar el estatus y, si algo falla, no se descarga nada — sólo se avisa.
 *
 * **Y por qué aquí NO se valida parseando el XML**, a diferencia del canónico: este archivo lleva
 * dentro el PDF original, el firmado, el definitivo y la rúbrica de cada firmante, todo en Base64.
 * Son decenas de MB en el caso normal. Pasarlos por `DOMParser` en el hilo principal congelaría la
 * pestaña justo cuando el usuario espera su descarga, y a cambio de poco: el contenido lo genera
 * nuestro propio serializador, que escapa lo que entra (ver `audit-xml.builder.ts` en el backend),
 * mientras que las respuestas que NO son el archivo se distinguen por su estatus HTTP. Por eso el
 * cuerpo se maneja como blob y nunca se materializa como string.
 */

/** Lo que el llamador muestra al usuario cuando la descarga no se puede completar. */
export class AuditXmlDownloadError extends Error {}

export async function downloadAuditXml(
  url: string,
  fileName: string,
): Promise<void> {
  let response: Response;

  try {
    response = await fetch(url, { headers: { Accept: 'application/xml' } });
  } catch {
    throw new AuditXmlDownloadError(
      'No se pudo conectar para obtener el XML de auditoría. Revisa tu conexión e inténtalo de nuevo.',
    );
  }

  if (!response.ok) {
    throw new AuditXmlDownloadError(errorMessage(response.status));
  }

  const blob = await response.blob();

  if (blob.size === 0) {
    throw new AuditXmlDownloadError(
      'El XML de auditoría llegó vacío, así que no se descargó nada.',
    );
  }

  // Se reenvuelve declarando el tipo: el blob de la respuesta hereda el Content-Type del servidor,
  // y con `charset=utf-8` explícito los acentos de los nombres y las CURP abren bien en cualquier
  // visor.
  saveBlobAsFile(
    new Blob([blob], { type: 'application/xml;charset=utf-8' }),
    fileName,
  );
}

/**
 * Cada error del backend dice algo distinto a quien consulta, y ninguno lo culpa a él.
 *
 * El 422 se traduce a un mensaje propio en vez de reenviar el del servidor: ese texto nombra
 * buckets y llaves de almacenamiento, que no le sirven de nada a quien abrió la vista pública.
 */
function errorMessage(status: number): string {
  if (status === 404) {
    return 'Este documento no tiene XML de auditoría disponible.';
  }

  if (status === 422) {
    return 'A este documento le falta evidencia para armar su XML de auditoría. Contacta a quien te lo compartió.';
  }

  return 'No se pudo obtener el XML de auditoría. Inténtalo de nuevo más tarde.';
}
