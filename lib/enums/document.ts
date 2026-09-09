/**
 * Enums compartidos para el dominio de documentos/firma. Espejo de los enums del backend
 * (signature-server/src/document/enum/*) para que el frontend deje de comparar el estado o tipo
 * de un documento contra magic strings — los valores coinciden exactamente con los que la API
 * serializa, así que se pueden usar directamente contra la respuesta del backend sin mapear nada.
 */

/** Espejo de DOCUMENT_STATUS_ENUM (signature-server/src/document/enum/document-status.enum.ts). */
export enum DocumentStatus {
  Created = 'created',
  Pending = 'pending',
  Signed = 'signed',
  Rejected = 'rejected',
  Expired = 'expired',
  CancellationPending = 'cancellation_pending',
  Cancelled = 'cancelled',
}

/** Espejo de SIGNEE_STATUS_ENUM (signature-server/src/document/enum/signee-status.enum.ts). */
export enum ParticipantStatus {
  Pending = 'pending',
  Signed = 'signed',
  Rejected = 'rejected',
}

/**
 * Espejo de COLABORATOR_TYPE_ENUM (signature-server/src/document/enum/colaborator-type.enum.ts)
 * más `Creator`, sintetizado solo en el frontend para el creador del documento (ver
 * `myRole` en DocumentService.findDetailForUser — el creador no es un CollaboratorEntity).
 */
export enum ParticipantRole {
  Signer = 'signer',
  Reviewer = 'reviewer',
  Watcher = 'watcher',
  Creator = 'creator',
}

/**
 * Espejo de DOCUMENT_VIEW_ENUM (signature-server/src/document/enum/document-view.enum.ts).
 *
 * Es el recorte del listado unificado. Sustituye a las tres rutas segmentadas: lo que antes era
 * "en qué pantalla estoy" ahora es un filtro que viaja al servidor, y por eso puede combinarse
 * con la búsqueda y con el resto de los filtros.
 */
export enum DocumentView {
  RequiresMySignature = 'requires_my_signature',
  CreatedByMe = 'created_by_me',
  Completed = 'completed',
  All = 'all',
}

/**
 * Espejo de DOCUMENT_PARTICIPATION_ENUM
 * (signature-server/src/document/enum/document-participation.enum.ts).
 *
 * Qué papel juega el usuario en cada documento del listado. Lo calcula el servidor por fila y es
 * personal: sin secciones que lo expliquen, es lo que dice por qué ese documento está en la
 * lista.
 */
export enum DocumentParticipation {
  RequiresMySignature = 'requires_my_signature',
  CreatedByMe = 'created_by_me',
  Participant = 'participant',
}

/** Espejo de SIGNATURE_TYPE_ENUM (signature-server/src/document/enum/signature-type.enum.ts). */
export enum SignatureType {
  Simple = 'simple',
  Fiel = 'fiel',
}
