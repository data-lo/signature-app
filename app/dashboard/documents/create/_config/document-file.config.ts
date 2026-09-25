/**
 * Restricciones del PDF que se sube a firma. Centralizadas porque el mismo límite se comunica en
 * tres lugares distintos (el texto de ayuda de la pantalla y los dos mensajes de validación de
 * FilePond): antes estaban escritos a mano en cada uno y podían desincronizarse.
 */
export const DOCUMENT_FILE_ACCEPTED_TYPES = ['application/pdf'];
export const DOCUMENT_FILE_MAX_SIZE_MB = 20;
export const DOCUMENT_FILE_MAX_SIZE = `${DOCUMENT_FILE_MAX_SIZE_MB}MB`;

/**
 * El mismo límite en bytes, con MB binarios (1 MB = 1024 × 1024), que es como lo mide el backend
 * (`MAX_PDF_FILE_SIZE_BYTES` en signature-server).
 *
 * A FilePond se le pasa este número y no la cadena `'20MB'`: FilePond convierte las cadenas con
 * base 1000, así que `'20MB'` eran 20 000 000 bytes y rechazaba en el navegador archivos de entre
 * 19.07 y 20 MB que el servidor sí acepta.
 */
export const DOCUMENT_FILE_MAX_SIZE_BYTES = DOCUMENT_FILE_MAX_SIZE_MB * 1024 * 1024;

/** Base con la que FilePond formatea los tamaños que muestra: la misma del límite. */
export const DOCUMENT_FILE_SIZE_BASE = 1024;

export const DOCUMENT_FILE_LABELS = {
  idle: 'Arrastra tu documento aquí o <span class="filepond--label-action">da clic para seleccionar uno</span>',
  typeNotAllowed: 'El documento debe estar en formato PDF',
  /** Segunda línea del error de tipo; sin ella FilePond la muestra en inglés. */
  expectedTypes: 'Selecciona un archivo PDF',
  maxSizeExceeded: `El documento debe pesar menos de ${DOCUMENT_FILE_MAX_SIZE}`,
  /** Segunda línea del error de tamaño; `{filesize}` lo sustituye FilePond por el límite. */
  maxSize: 'El tamaño máximo es {filesize}',
} as const;

export const DOCUMENT_FILE_HELP_TEXT = `El documento debe estar en formato PDF y pesar menos de ${DOCUMENT_FILE_MAX_SIZE_MB} MB.`;
