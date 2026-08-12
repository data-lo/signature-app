/**
 * Restricciones del PDF que se sube a firma. Centralizadas porque el mismo límite se comunica en
 * tres lugares distintos (el texto de ayuda de la pantalla y los dos mensajes de validación de
 * FilePond): antes estaban escritos a mano en cada uno y podían desincronizarse.
 */
export const DOCUMENT_FILE_ACCEPTED_TYPES = ['application/pdf'];
export const DOCUMENT_FILE_MAX_SIZE_MB = 20;
export const DOCUMENT_FILE_MAX_SIZE = `${DOCUMENT_FILE_MAX_SIZE_MB}MB`;

export const DOCUMENT_FILE_LABELS = {
  idle: 'Arrastra tu documento aquí o <span class="filepond--label-action">da clic para seleccionar uno</span>',
  typeNotAllowed: 'El documento debe estar en formato PDF',
  maxSizeExceeded: `El documento debe pesar menos de ${DOCUMENT_FILE_MAX_SIZE}`,
} as const;

export const DOCUMENT_FILE_HELP_TEXT = `El documento debe estar en formato PDF y pesar menos de ${DOCUMENT_FILE_MAX_SIZE_MB} MB.`;
