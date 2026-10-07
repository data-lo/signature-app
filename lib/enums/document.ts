export enum DocumentStatus {
  Created = 'CREATED',
  /** Esperando la decisión del aprobador: nadie puede firmar todavía. */
  PendingApproval = 'PENDING_APPROVAL',
  /** El flujo de firma está abierto. */
  PendingSignature = 'PENDING_SIGNATURE',
  Signed = 'SIGNED',
  Rejected = 'REJECTED',
  Expired = 'EXPIRED',
  CancellationPending = 'CANCELLATION_PENDING',
  Cancelled = 'CANCELLED',
}

export enum ParticipantStatus {
  Pending = 'PENDING',
  /** Sólo un REVIEWER: autorizó que el documento salga a firma. */
  Approved = 'APPROVED',
  Signed = 'SIGNED',
  Rejected = 'REJECTED',
  Notified = 'NOTIFIED',
}

export enum ParticipantRole {
  Signer = 'SIGNER',
  Reviewer = 'REVIEWER',
  Witness = 'WITNESS',
  Creator = 'creator',
}

export enum DocumentView {
  RequiresMySignature = 'requires_my_signature',
  CreatedByMe = 'created_by_me',
  Completed = 'completed',
  All = 'all',
}

export enum DocumentParticipation {
  RequiresMySignature = 'requires_my_signature',
  CreatedByMe = 'created_by_me',
  Participant = 'participant',
}

export enum SignatureType {
  Simple = 'SIMPLE',
  Fiel = 'FIEL',
  BIOMETRIC = 'BIOMETRIC',
}

export enum BiometricSignatureStatus {
  Pending = 'PENDING',
  InProgress = 'IN_PROGRESS',
  Approved = 'APPROVED',
  Declined = 'DECLINED',
  Expired = 'EXPIRED',
  Failed = 'FAILED',
}
