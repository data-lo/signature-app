import { SignatureType } from '@/lib/enums/document';
import type { PublicSigningInvitation } from '../public/documents/[id]/sign/_requests';

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
  | 'ERROR';

/** Cuenta de plataforma del firmante, según el backend. */
export type SignerAccountStatus = 'NONE' | 'ACTIVE' | 'PROVISIONED';

/** Documento que se firma. */
export interface DocumentSigningContext {
  /** Lo usan los flujos de invitado, cuyos endpoints van por documento. Nunca va en la URL nueva. */
  id: string;
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

/** Respuesta de `GET /public/signing-sessions/:token` (ver `GetSigningSessionUseCase`). */
export interface SigningSessionResponse {
  status:
    | 'ACTIVE'
    | 'EXPIRED'
    | 'REVOKED'
    | 'ALREADY_SIGNED'
    | 'DOCUMENT_CANCELLED'
    | 'UNAVAILABLE';
  document?: { id: string; name: string };
  signer?: {
    collaboratorId: string;
    maskedEmail: string;
    /** Ciclo de vida del usuario de la cuenta vinculada; `null` sin cuenta. */
    accountStatus: 'ACTIVE' | 'PROVISIONED' | null;
    guestSigningAllowed: boolean;
  };
  signature?: {
    type: string;
    requiresEmailVerification: boolean;
    requiresIdentityValidation: boolean;
  };
  positions?: SignaturePosition[];
  expiresAt?: string;
}

/** Tipo del backend → tipo de flujo. Lo que no esté aquí no tiene flujo. */
const BACKEND_SIGNATURE_TYPES: Readonly<Record<string, SignatureFlowType>> = {
  [SignatureType.Simple]: 'SIMPLE',
  [SignatureType.Fiel]: 'ADVANCED',
  [SignatureType.BIOMETRIC]: 'BIOMETRIC',
};

/**
 * Traduce el tipo de firma del backend al vocabulario de la pantalla.
 *
 * @param backendType - `SIMPLE`, `FIEL` o `BIOMETRIC` (o lo que mande el backend).
 * @returns El tipo de flujo, o `null` si no se conoce.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * toSignatureFlowType('FIEL'); // 'ADVANCED'
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
 * Adaptador de la ruta nueva: sesión del token (`/sign/:token`) → `SigningSessionState`.
 *
 * @param response - Respuesta del backend.
 * @returns La sesión activa, o sólo el estado si la invitación ya no sirve (o llegó incompleta).
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * fromSigningSessionResponse({ status: 'EXPIRED' }); // { status: 'EXPIRED' }
 * ```
 */
export function fromSigningSessionResponse(
  response: SigningSessionResponse,
): SigningSessionState {
  if (response.status !== 'ACTIVE') return { status: response.status };

  const { document, signer, signature } = response;
  if (!document || !signer || !signature) return { status: 'INVALID' };

  return {
    status: 'ACTIVE',
    document: { id: document.id, name: document.name },
    signer: {
      collaboratorId: signer.collaboratorId,
      maskedEmail: signer.maskedEmail,
      accountStatus: signer.accountStatus ?? 'NONE',
      guestSigningAllowed: signer.guestSigningAllowed,
    },
    signature: {
      type: toSignatureFlowType(signature.type),
      requiresEmailVerification: signature.requiresEmailVerification,
      requiresIdentityValidation: signature.requiresIdentityValidation,
    },
    positions: response.positions ?? [],
    expiresAt: response.expiresAt,
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
