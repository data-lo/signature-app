import { SignatureType } from '@/lib/enums/document';
import type { PublicSigningInvitation } from '../public/documents/[id]/sign/_requests';
import type {
  CertificateRequirements,
  CurrentSigningSession,
  IdentityVerificationState,
  InvitationContext,
  SigningReadiness,
} from './invitation/invitation-requests';

/**
 * Tipo de firma tal como lo resuelve la pantalla pública. Es el vocabulario del ticket, no el del
 * backend: el backend llama `FIEL` a lo que aquí es `ADVANCED` (ver `toSignatureFlowType`).
 */
export type SignatureFlowType = 'SIMPLE' | 'ADVANCED' | 'BIOMETRIC';

/**
 * En qué punto está la sesión de firma. Sólo `ACTIVE` monta un flujo de firma; los demás son
 * estados controlados de `SigningSessionStatusView`.
 *
 * - `LOADING`: todavía se está resolviendo.
 * - `ACTIVE`: el firmante puede continuar.
 * - `INVALID`: el enlace no corresponde a ninguna invitación.
 * - `EXPIRED` / `REVOKED`: la invitación venció o se revocó.
 * - `ALREADY_SIGNED`: el firmante ya firmó, o el documento quedó firmado por todos.
 * - `DOCUMENT_CANCELLED`: el documento se canceló.
 * - `UNAVAILABLE`: el documento no admite la firma de este firmante.
 * - `WAITING_FOR_PREVIOUS_SIGNER`: el documento es secuencial y todavía no es su turno.
 * - `ACCOUNT_REQUIRED`: la invitación está vinculada a una cuenta de la plataforma; se firma desde
 *   ella, no desde el enlace.
 * - `SESSION_EXPIRED`: la sesión de firma (o el acceso a la invitación) venció; hay que volver a
 *   abrir el enlace.
 * - `ERROR`: no se pudo consultar (red, 5xx); se puede reintentar.
 */
export type SigningSessionStatus =
  | 'LOADING'
  | 'ACTIVE'
  | 'INVALID'
  | 'EXPIRED'
  | 'REVOKED'
  | 'ALREADY_SIGNED'
  | 'DOCUMENT_CANCELLED'
  | 'UNAVAILABLE'
  | 'WAITING_FOR_PREVIOUS_SIGNER'
  | 'ACCOUNT_REQUIRED'
  | 'SESSION_EXPIRED'
  | 'ERROR';

/** Cuenta de plataforma del firmante, según el backend. */
export type SignerAccountStatus = 'NONE' | 'ACTIVE' | 'PROVISIONED';

/** Documento que se firma. */
export interface DocumentSigningContext {
  /**
   * Lo usan los flujos de invitado de `/public/documents/:id/sign`, cuyos endpoints van por
   * documento. `null` en la sesión de una invitación individual: ahí el navegador nunca lo conoce.
   */
  id: string | null;
  /** `null` cuando no se conoce (de regreso de Didit, sin invitación en la URL). */
  name: string | null;
}

/** Firmante de la invitación. Todo lo decide el backend; la pantalla no lo puede cambiar. */
export interface SignerSigningContext {
  /** Colaborador de la invitación; `null` sólo al retomar la biometría de regreso de Didit. */
  collaboratorId: string | null;
  /** Correo del enlace viejo (`?email=`), si lo traía. Sólo se reenvía; nunca autoriza nada. */
  email?: string;
  /** Correo invitado enmascarado por el backend (`a***@empresa.com`). */
  maskedEmail?: string;
  accountStatus: SignerAccountStatus;
  /** Puede firmar sin cuenta (no tiene cuenta vinculada y su tipo lo admite). */
  guestSigningAllowed: boolean;
}

/** Posición de la firma del firmante en una página, en ratios 0-1 desde la esquina superior izquierda. */
export interface SignaturePosition {
  page: number;
  xRatio: number;
  yRatio: number;
  widthRatio: number;
  heightRatio: number;
}

/** Sesión de firma normalizada: lo que ambas rutas entregan a `PublicSigningLayout`. */
export interface SigningSession {
  status: SigningSessionStatus;
  document: DocumentSigningContext;
  signer: SignerSigningContext;
  signature: {
    /** `null` si el backend mandó un tipo que esta pantalla no conoce: nunca se adivina uno. */
    type: SignatureFlowType | null;
    requiresEmailVerification: boolean;
    requiresIdentityValidation: boolean;
  };
  positions: SignaturePosition[];
  expiresAt?: string;
  /**
   * Sólo en la sesión de una invitación individual (`/sign/:token`, `/sign/launch/:token`): lo que
   * el backend resolvió para firmar desde la cookie de la sesión.
   */
  sessionDetails?: {
    /** SHA-256 del PDF vigente; se manda al firmar. */
    documentHash: string | null;
    /** El documento espera su firma y es su turno. */
    canSign: boolean;
    /** Firma simple: credencial del usuario provisional (`SigningCredentialStatus`). */
    credentialStatus: string | null;
    /** Si ya se puede firmar según el backend y, si no, por qué. */
    readiness?: SigningReadiness;
    /** Firma simple: estado de la verificación de identidad. */
    identityVerification?: IdentityVerificationState | null;
    /** Firma avanzada: qué se valida del certificado. */
    certificateRequirements?: CertificateRequirements | null;
  };
}

/** Lo que reciben los flujos y el layout: una sesión activa, o sólo el estado que la impide. */
export type SigningSessionState =
  SigningSession | { status: Exclude<SigningSessionStatus, 'ACTIVE'> };

/** Resultado de una firma completada por un flujo. */
export interface SigningResult {
  /** `true` si con esta firma el documento quedó firmado por todos. */
  documentCompleted: boolean;
}

/** Fallo inesperado de un flujo, para registrarlo sin datos sensibles. */
export interface SigningError {
  cause: unknown;
}

/** Tipo del backend → tipo de flujo. Lo que no esté aquí no tiene flujo. */
const BACKEND_SIGNATURE_TYPES: Readonly<Record<string, SignatureFlowType>> = {
  [SignatureType.Simple]: 'SIMPLE',
  [SignatureType.Fiel]: 'ADVANCED',
  // La sesión pública ya habla el vocabulario del contrato.
  ADVANCED: 'ADVANCED',
  [SignatureType.BIOMETRIC]: 'BIOMETRIC',
};

/**
 * Traduce el tipo de firma del backend al vocabulario de la pantalla.
 *
 * @param backendType - `SIMPLE`, `FIEL`/`ADVANCED` o `BIOMETRIC` (o lo que mande el backend).
 * @returns El tipo de flujo, o `null` si no se conoce.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * toSignatureFlowType('FIEL'); // 'ADVANCED'
 * toSignatureFlowType('ADVANCED'); // 'ADVANCED'
 * toSignatureFlowType('NOM151'); // null
 * ```
 */
export function toSignatureFlowType(
  backendType: string | null | undefined,
): SignatureFlowType | null {
  if (!backendType) return null;
  return Object.hasOwn(BACKEND_SIGNATURE_TYPES, backendType)
    ? BACKEND_SIGNATURE_TYPES[backendType]
    : null;
}

/**
 * Adaptador de la invitación individual ANTES del código (`/sign/:token`, `/sign/launch/:token`):
 * su contexto mínimo → el estado que se muestra. Una invitación activa que sólo se firma desde la
 * cuenta de la plataforma se informa como `ACCOUNT_REQUIRED`: el enlace no la deja seguir.
 *
 * @param context - Contexto que devolvió el canje del token.
 * @returns El estado de la pantalla; `ACTIVE` sólo si puede pedir el código.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * invitationStatusOf({ status: 'WAITING_FOR_PREVIOUS_SIGNER' }); // 'WAITING_FOR_PREVIOUS_SIGNER'
 * ```
 */
export function invitationStatusOf(
  context: InvitationContext,
): SigningSessionStatus {
  if (context.status !== 'ACTIVE') return context.status;
  if (!context.signer || !context.signature) return 'INVALID';
  if (!context.signer.publicSigningAllowed) return 'ACCOUNT_REQUIRED';
  return 'ACTIVE';
}

/**
 * Adaptador de la sesión pública DESPUÉS del código: `GET /public/signing-sessions/current` →
 * `SigningSession`. Es la misma sesión llegue el firmante por el correo o por el portal del tercero.
 *
 * @param current - Contexto completo de la sesión.
 * @returns La sesión activa, con sus detalles para firmar.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * fromCurrentSigningSession(current).signature.type; // 'SIMPLE'
 * ```
 */
export function fromCurrentSigningSession(
  current: CurrentSigningSession,
): SigningSession {
  const type = toSignatureFlowType(current.signature.type);
  return {
    status: 'ACTIVE',
    document: { id: null, name: current.document.name },
    signer: {
      collaboratorId: null,
      maskedEmail: current.signer.emailMasked ?? current.signer.maskedEmail,
      accountStatus: current.signer.accountStatus ?? 'NONE',
      guestSigningAllowed: true,
    },
    signature: {
      type,
      requiresEmailVerification: true,
      requiresIdentityValidation: current.signature.requiresIdentityValidation,
    },
    positions: current.positions,
    expiresAt: current.session.expiresAt,
    sessionDetails: {
      documentHash: current.document.documentHash,
      canSign: current.signer.canSign,
      credentialStatus: current.signature.credentialStatus,
      readiness: current.status,
      identityVerification: current.signature.identityVerification ?? null,
      certificateRequirements:
        current.signature.certificateRequirements ?? null,
    },
  };
}

/**
 * Adaptador de la ruta actual (`/public/documents/:id/sign`): invitación validada por documento +
 * colaborador → `SigningSession`. Sólo se usa cuando el invitado eligió continuar sin cuenta, así
 * que el firmante no tiene cuenta vinculada.
 *
 * La invitación vieja no trae posiciones ni validaciones: las validaciones se deducen del tipo,
 * igual que en el backend.
 *
 * @param documentId - Documento de la ruta.
 * @param invitation - Invitación validada; `null` al retomar la biometría de regreso de Didit.
 * @param link - Colaborador y, si la URL lo trae, correo del enlace.
 * @param fallbackType - Tipo a usar sin invitación (de regreso de Didit, siempre `BIOMETRIC`).
 * @returns La sesión activa.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * fromPublicSigningInvitation('doc-1', invitation, { collaboratorId: 'c-1', email: null });
 * ```
 */
export function fromPublicSigningInvitation(
  documentId: string,
  invitation: PublicSigningInvitation | null,
  link: { collaboratorId: string | null; email: string | null },
  fallbackType: SignatureType | null = null,
): SigningSession {
  const type = toSignatureFlowType(invitation?.signatureType ?? fallbackType);

  return {
    status: 'ACTIVE',
    document: { id: documentId, name: invitation?.documentName ?? null },
    signer: {
      collaboratorId: link.collaboratorId,
      ...(link.email ? { email: link.email } : {}),
      ...(invitation ? { maskedEmail: invitation.maskedEmail } : {}),
      accountStatus: 'NONE',
      guestSigningAllowed: invitation?.guestSigningAllowed ?? true,
    },
    signature: {
      type,
      requiresEmailVerification: true,
      requiresIdentityValidation: type === 'BIOMETRIC',
    },
    positions: [],
  };
}

/**
 * Indica si un estado es una sesión activa, con documento y firmante.
 *
 * @param state - Estado de la sesión.
 * @returns `true` si se puede montar un flujo.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * if (isActiveSigningSession(state)) state.document.id;
 * ```
 */
export function isActiveSigningSession(
  state: SigningSessionState,
): state is SigningSession {
  return state.status === 'ACTIVE' && 'document' in state;
}
