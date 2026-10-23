import { SIGNATURE_TYPE_LABELS } from './_config/signature-type.config';
import {
  SIGNATURE_POSITION_REQUIRED_MESSAGE,
  type DocumentSignatureType,
} from './_schemas';

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
  /** "Requiere aprobación" está activo (sólo posible en cuentas ORGANIZATION). */
  requiresApproval?: boolean;
  /** Usuario elegido para aprobar, cuando la aprobación está activa. */
  reviewerUserId?: string | null;
  signerCount: number;
  witnessCount: number;
  /**
   * Firmantes que todavía no tienen ninguna ubicación de firma sobre el PDF (ver
   * `signersWithoutPosition`). Vacío cuando a nadie le falta.
   */
  signersWithoutPosition?: string[];
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
  witnessCount: string;
}

export interface CreateDocumentProgress {
  upload: SectionProgress;
  configuration: SectionProgress;
  participants: SectionProgress;
  /**
   * Ubicación de firmas (historia "Hacer obligatorias las coordenadas de posición de firma"):
   * completa cuando cada firmante tiene al menos una firma colocada. `missingMessage` dice a
   * quién le falta, y sólo existe cuando hay PDF y firmantes —antes no hay dónde ni a quién
   * ubicar, y el aviso sería ruido—.
   */
  signaturePlacement: { isComplete: boolean; missingMessage?: string };
  /** Siempre presente: los datos que faltan se muestran como "Pendiente", no se ocultan. */
  summary: CreateDocumentSummary;
  /**
   * Todo lo que la solicitud necesita: PDF cargado, tipo de firma elegido, al menos un firmante y
   * la firma de cada firmante ubicada en el documento.
   */
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
  requiresApproval = false,
  reviewerUserId = null,
  signerCount,
  witnessCount,
  signersWithoutPosition = [],
}: CreateDocumentProgressParams): CreateDocumentProgress {
  // Un archivo a medio procesar no cuenta como cargado: es el mismo criterio con el que
  // `_section-rules.ts` decide que todavía no hay nada que previsualizar.
  const hasUsableFile = hasFile && !isFileLoading;
  const hasSignatureType = signatureType !== undefined;
  /**
   * Marcar "Requiere aprobación" sin elegir aprobador deja la configuración a medias, así que la
   * sección no se da por completa y el botón de envío sigue deshabilitado. Es deliberado que el
   * usuario lo note aquí —en la palomita de la sección— y no al pulsar el botón: el envío abre
   * antes el modal de Búsqueda Inteligente, y descubrir el error después de contestarlo sería
   * pedirle una decisión sobre un documento que no se iba a mandar.
   */
  const hasReviewer = !requiresApproval || !!reviewerUserId;
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
    isComplete: hasSignatureType && hasReviewer,
    collapsedSummary:
      signatureType === undefined
        ? PENDING_LABEL
        : SIGNATURE_TYPE_LABELS[signatureType],
  };

  const participants: SectionProgress = {
    isComplete: hasSigners,
    collapsedSummary: [
      pluralize(signerCount, 'firmante', 'firmantes'),
      pluralize(witnessCount, 'testigo', 'testigos'),
    ].join(' · '),
  };

  const hasAllSignaturesPlaced = signersWithoutPosition.length === 0;
  const signaturePlacement = {
    isComplete: hasSigners && hasAllSignaturesPlaced,
    missingMessage:
      hasUsableFile && hasSigners && !hasAllSignaturesPlaced
        ? `${SIGNATURE_POSITION_REQUIRED_MESSAGE} Falta: ${signersWithoutPosition.join(', ')}.`
        : undefined,
  };

  return {
    upload,
    configuration,
    participants,
    signaturePlacement,
    summary: {
      documentName: hasUsableFile && fileName ? fileName : PENDING_LABEL,
      pageCount: hasUsableFile ? pageCountLabel : PENDING_LABEL,
      signatureType: configuration.collapsedSummary,
      signerCount: hasSigners
        ? pluralize(signerCount, 'firmante', 'firmantes')
        : PENDING_LABEL,
      witnessCount: pluralize(witnessCount, 'testigo', 'testigos'),
    },
    isReadyToSubmit:
      upload.isComplete &&
      configuration.isComplete &&
      participants.isComplete &&
      signaturePlacement.isComplete,
  };
}
