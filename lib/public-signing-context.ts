import apiClient from '@/lib/axios';

/**
 * Contexto temporal de una invitación de firma mientras el invitado inicia sesión o se registra
 * desde la pantalla pública `/public/documents/:documentId/sign`.
 *
 * Contiene SOLAMENTE lo necesario para volver: ni el correo, ni el token de sesión, ni ningún
 * código. Vive en `sessionStorage`: muere con la pestaña, así que tampoco sobrevive a cerrar el
 * navegador en una computadora compartida.
 */
export interface PublicSigningContext {
  documentId: string;
  /** Referencia de la invitación: el id del colaborador del enlace. No autoriza nada por sí sola. */
  invitationReference: string;
  /** Pantalla pública a la que se vuelve si la vinculación no se confirma. */
  returnTo: string;
}

/** Resultado de vincular la cuenta a una invitación (ver `COLLABORATOR_LINK_OUTCOME_ENUM`). */
export type InvitationLinkOutcome =
  'LINKED' | 'ALREADY_LINKED' | 'ACCOUNT_MISMATCH' | 'NOT_AVAILABLE';

export interface InvitationLinkResult {
  /** `true` sólo con `LINKED` o `ALREADY_LINKED`: el backend confirmó que la cuenta es el firmante. */
  linked: boolean;
  outcome: InvitationLinkOutcome;
}

const STORAGE_KEY = 'public-signing-context';

/**
 * Ruta de la pantalla pública de firma de un documento.
 *
 * @param documentId - Documento.
 * @returns `/public/documents/:documentId/sign`.
 *
 * @example
 * ```ts
 * publicSigningPath('doc-1'); // '/public/documents/doc-1/sign'
 * ```
 */
export function publicSigningPath(documentId: string): string {
  return `/public/documents/${documentId}/sign`;
}

/**
 * Guarda el contexto de la invitación antes de mandar al invitado a `/login`.
 *
 * @param documentId - Documento.
 * @param invitationReference - Id del colaborador de la invitación.
 * @returns Nada. Sin `sessionStorage` disponible, el login funciona igual pero sin regresar al
 *   documento.
 *
 * @example
 * ```ts
 * setPublicSigningContext('doc-1', 'c-1');
 * ```
 */
export function setPublicSigningContext(
  documentId: string,
  invitationReference: string,
): void {
  const context: PublicSigningContext = {
    documentId,
    invitationReference,
    returnTo: publicSigningPath(documentId),
  };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(context));
  } catch {
    // Modo privado estricto o cuota llena: se sigue sin contexto.
  }
}

/**
 * Lee el contexto guardado, si es válido.
 *
 * `returnTo` se vuelve a calcular y tiene que coincidir: un valor manipulado en el almacenamiento
 * nunca convierte esto en una redirección a otro sitio.
 *
 * @returns El contexto, o `null` si no hay, está malformado o el almacenamiento no está disponible.
 *
 * @example
 * ```ts
 * const context = getPublicSigningContext(); // { documentId, invitationReference, returnTo } | null
 * ```
 */
export function getPublicSigningContext(): PublicSigningContext | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PublicSigningContext>;
    if (
      typeof parsed.documentId !== 'string' ||
      typeof parsed.invitationReference !== 'string' ||
      parsed.returnTo !== publicSigningPath(parsed.documentId)
    ) {
      return null;
    }
    return parsed as PublicSigningContext;
  } catch {
    return null;
  }
}

/**
 * Borra el contexto: tras vincular, al elegir continuar sin cuenta o al cancelar.
 *
 * @returns Nada.
 *
 * @example
 * ```ts
 * clearPublicSigningContext();
 * ```
 */
export function clearPublicSigningContext(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nada que borrar.
  }
}

/**
 * Pide al backend que vincule la cuenta autenticada a una invitación. El frontend no manda ningún
 * correo: el backend compara el correo verificado de la sesión con el de la invitación.
 *
 * @param documentId - Documento.
 * @param invitationReference - Id del colaborador de la invitación.
 * @returns Si quedó vinculada y el resultado exacto.
 *
 * @throws {AxiosError} 404 si la invitación no existe, o un error de red.
 *
 * @example
 * ```ts
 * const { linked, outcome } = await linkInvitationRequest('doc-1', 'c-1');
 * ```
 */
export async function linkInvitationRequest(
  documentId: string,
  invitationReference: string,
): Promise<InvitationLinkResult> {
  const { data } = await apiClient.patch<{ data: InvitationLinkResult }>(
    `/api/v1/document/${documentId}/link-collaborator`,
    { collaboratorId: invitationReference },
  );
  return data.data;
}

/**
 * A dónde mandar al usuario recién autenticado (login o registro) si venía de una invitación.
 *
 * Vincula la cuenta a la invitación guardada y:
 * - si el backend la confirma → borra el contexto y devuelve el documento en el dashboard;
 * - si no (otra cuenta, invitación resuelta, error de red) → devuelve la pantalla pública y deja el
 *   contexto, para que ésta sepa qué invitación mostrar y explique qué pasó. Nunca se abre el
 *   dashboard sin confirmación del backend.
 *
 * @returns La ruta de destino, o `null` si no venía de una invitación.
 *
 * @example
 * ```ts
 * const destination = await resolvePublicSigningDestination();
 * window.location.href = destination ?? '/dashboard/documents/create';
 * ```
 */
export async function resolvePublicSigningDestination(): Promise<
  string | null
> {
  const context = getPublicSigningContext();
  if (!context) return null;

  try {
    const result = await linkInvitationRequest(
      context.documentId,
      context.invitationReference,
    );
    if (result.linked) {
      clearPublicSigningContext();
      return `/dashboard/documents/${context.documentId}`;
    }
  } catch {
    // La pantalla pública reintenta la vinculación y muestra el error con su propio estado.
  }
  return context.returnTo;
}
