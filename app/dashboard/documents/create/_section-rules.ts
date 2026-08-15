import type { SectionState } from './_interfaces/section-state.interface';

/**
 * Reglas de activación de la pantalla de carga y configuración de documentos, en un solo lugar y
 * como función pura: ningún componente decide por su cuenta si otra sección está habilitada, y
 * las reglas se pueden testear sin montar la pantalla. Cada regla está justificada abajo — cuando
 * una sección está siempre habilitada, el motivo también es explícito (que no dependa de nada es
 * una decisión, no un olvido).
 */

export const MISSING_FILE_MESSAGE =
  'La previsualización del documento aparecerá aquí';

export interface CreateDocumentSectionsParams {
  /** Hay un PDF completamente cargado por FilePond (no uno a medio procesar). */
  hasFile: boolean;
  /** FilePond está procesando un archivo localmente. */
  isFileLoading: boolean;
  /** Error general de la sección de participantes (p. ej. "agrega al menos un firmante"). */
  participantsErrorMessage?: string;
  /**
   * Las tres secciones de la solicitud están completas (ver `_section-progress.ts`): documento
   * cargado, tipo de firma elegido y al menos un firmante. Es el único requisito del envío —
   * ninguna sección se bloquea entre sí, así que el usuario puede llenarlas en el orden que
   * quiera y el botón se habilita cuando ya no falta nada.
   */
  isReadyToSubmit: boolean;
  /** La mutación de envío a firma está en curso. */
  isSubmitting: boolean;
  /** Error devuelto por la mutación de envío a firma. */
  submitErrorMessage?: string;
  /** La pantalla incluye la tabla de documentos creados (ver `CreateDocumentView`). */
  showCreatedDocuments: boolean;
  isLoadingCreatedDocuments: boolean;
  createdDocumentsErrorMessage?: string;
}

export interface CreateDocumentSections {
  upload: SectionState;
  configuration: SectionState;
  participants: SectionState;
  signaturePlacement: SectionState;
  createdDocuments: SectionState;
  /** Estado del envío a firma (botón "Firmar"): habilitado, en curso y error del backend. */
  submission: SectionState;
}

export function buildCreateDocumentSections({
  hasFile,
  isFileLoading,
  participantsErrorMessage,
  isReadyToSubmit,
  isSubmitting,
  submitErrorMessage,
  showCreatedDocuments,
  isLoadingCreatedDocuments,
  createdDocumentsErrorMessage,
}: CreateDocumentSectionsParams): CreateDocumentSections {
  const hasUsableFile = hasFile && !isFileLoading;

  return {
    // Carga del documento: es el punto de entrada del flujo, no tiene requisitos previos. Sigue
    // habilitada durante el envío para permitir reemplazar el PDF sin recargar la pantalla.
    upload: {
      isEnabled: true,
      isLoading: isFileLoading,
      hasError: false,
    },

    // Configuración: el usuario puede prepararla antes de elegir el archivo (no hay nada del PDF
    // de lo que dependa). Las restricciones internas de cada opción son de campo, no de sección:
    // "Requiere aprobación" solo existe en cuentas ORGANIZATION y "Requiere firmas en orden" solo
    // se habilita con más de 2 firmantes — cada campo las resuelve con su propio contexto.
    configuration: {
      isEnabled: true,
      isLoading: false,
      hasError: false,
    },

    // Participantes: tampoco depende del archivo — capturar firmantes antes de cargar el PDF es
    // parte del flujo actual, y el requisito del archivo se aplica al enviar (`canSubmit`). Su
    // error es general (no pertenece a un campo): "agrega al menos un firmante".
    participants: {
      isEnabled: true,
      isLoading: false,
      hasError: Boolean(participantsErrorMessage),
      errorMessage: participantsErrorMessage,
    },

    // Ubicación de firmas: sí tiene un requisito previo duro — se colocan firmas sobre el PDF
    // renderizado, así que sin un archivo completamente cargado no hay nada sobre lo que arrastrar.
    signaturePlacement: {
      isEnabled: hasUsableFile,
      isLoading: isFileLoading,
      hasError: false,
      missingRequirementMessage: hasUsableFile ? undefined : MISSING_FILE_MESSAGE,
    },

    // Documentos creados: solo se muestra en las pantallas que la piden (ver
    // `showCreatedDocuments`); su carga y su error son los de la consulta del listado.
    createdDocuments: {
      isEnabled: showCreatedDocuments,
      isLoading: showCreatedDocuments && isLoadingCreatedDocuments,
      hasError: showCreatedDocuments && Boolean(createdDocumentsErrorMessage),
      errorMessage: showCreatedDocuments
        ? createdDocumentsErrorMessage
        : undefined,
    },

    // Envío: exige que las tres secciones estén completas (ver `_section-progress.ts`, que ya
    // trata un archivo a medio procesar como "todavía no cargado", para no mandar el anterior
    // mientras se reemplaza) y que no haya otro envío en curso. Se modela como sección (y no
    // como un booleano suelto) para que el botón, su estado de carga y el error del backend se
    // lean del mismo lugar que el resto de la pantalla.
    submission: {
      isEnabled: isReadyToSubmit && !isSubmitting,
      isLoading: isSubmitting,
      hasError: Boolean(submitErrorMessage),
      errorMessage: submitErrorMessage,
    },
  };
}
