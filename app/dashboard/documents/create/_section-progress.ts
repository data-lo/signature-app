import { SIGNATURE_TYPE_LABELS } from './_config/signature-type.config';
import type { DocumentSignatureType } from './_schemas';

/**
 * Qué tan completa está cada sección de la solicitud de firma, qué muestra su encabezado cuando
 * está contraída y qué dice el resumen fijo que vive debajo de los tres acordeones.
 *
 * Es una función pura, separada de `_section-rules.ts` a propósito: aquella responde "¿esta
 * sección se puede usar?" (habilitada, cargando, con error) y esta responde "¿ya está
 * configurada?". Ninguna sección se bloquea por el estado de otra —las tres se pueden abrir y
 * editar en cualquier momento—, así que "completa" es solo información: alimenta la palomita del
 * encabezado, el resumen y la habilitación del botón "Firmar".
 */

/** Lo que se muestra en el resumen mientras un dato todavía no existe. */
export const PENDING_LABEL = 'Pendiente';

export interface CreateDocumentProgressParams {
  /** Hay un PDF seleccionado (aunque FilePond todavía lo esté procesando). */
  hasFile: boolean;
  isFileLoading: boolean;
  fileName?: string;
  /** Páginas del PDF ya renderizado; `null` mientras el visor no terminó de leerlo. */
  pageCount: number | null;
  signatureType?: DocumentSignatureType;
  signerCount: number;
  viewerCount: number;
}

export interface SectionProgress {
  /** La sección tiene todo lo que el envío necesita de ella. */
  isComplete: boolean;
  /** Resumen que muestra el encabezado del acordeón mientras está contraído. */
  collapsedSummary: string;
}

export interface CreateDocumentSummary {
  documentName: string;
  pageCount: string;
  signatureType: string;
  signerCount: string;
  viewerCount: string;
}

export interface CreateDocumentProgress {
  upload: SectionProgress;
  configuration: SectionProgress;
  participants: SectionProgress;
  /** Siempre presente: los datos que faltan se muestran como "Pendiente", no se ocultan. */
  summary: CreateDocumentSummary;
  /** Las tres secciones completas: PDF cargado, tipo de firma elegido y al menos un firmante. */
  isReadyToSubmit: boolean;
}

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function buildCreateDocumentProgress({
  hasFile,
  isFileLoading,
  fileName,
  pageCount,
  signatureType,
  signerCount,
  viewerCount,
}: CreateDocumentProgressParams): CreateDocumentProgress {
  // Un archivo a medio procesar no cuenta como cargado: es el mismo criterio con el que
  // `_section-rules.ts` decide que todavía no hay nada que previsualizar.
  const hasUsableFile = hasFile && !isFileLoading;
  const hasSignatureType = signatureType !== undefined;
  const hasSigners = signerCount > 0;

  const pageCountLabel =
    pageCount === null ? PENDING_LABEL : pluralize(pageCount, 'página', 'páginas');

  const upload: SectionProgress = {
    isComplete: hasUsableFile,
    collapsedSummary: !hasUsableFile
      ? PENDING_LABEL
      : // El conteo de páginas llega cuando el visor termina de leer el PDF, después del nombre
        // del archivo: hasta entonces el encabezado muestra solo lo que ya se sabe.
        [fileName, pageCount === null ? null : pageCountLabel]
          .filter(Boolean)
          .join(' · '),
  };

  const configuration: SectionProgress = {
    isComplete: hasSignatureType,
    collapsedSummary:
      signatureType === undefined
        ? PENDING_LABEL
        : SIGNATURE_TYPE_LABELS[signatureType],
  };

  const participants: SectionProgress = {
    isComplete: hasSigners,
    collapsedSummary: [
      pluralize(signerCount, 'firmante', 'firmantes'),
      pluralize(viewerCount, 'espectador', 'espectadores'),
    ].join(' · '),
  };

  return {
    upload,
    configuration,
    participants,
    summary: {
      documentName: hasUsableFile && fileName ? fileName : PENDING_LABEL,
      pageCount: hasUsableFile ? pageCountLabel : PENDING_LABEL,
      signatureType: configuration.collapsedSummary,
      signerCount: hasSigners
        ? pluralize(signerCount, 'firmante', 'firmantes')
        : PENDING_LABEL,
      viewerCount: pluralize(viewerCount, 'espectador', 'espectadores'),
    },
    isReadyToSubmit:
      upload.isComplete && configuration.isComplete && participants.isComplete,
  };
}
