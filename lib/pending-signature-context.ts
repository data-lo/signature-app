export interface PendingSignatureContext {
  documentId: string;
  collaboratorId: string;
  email: string;
}

const STORAGE_KEY = 'pending_signature_context';

/**
 * Contexto capturado en /access-document (ver historia "Notificación por Email para Firma
 * Simple y Vinculación de Cuenta") — se guarda en localStorage en vez de arrastrarse por query
 * params en /login o /register, para no exponer datos ni saturar la URL. Debe limpiarse
 * obligatoriamente una vez consumido (ver clearPendingSignatureContext).
 */
export function setPendingSignatureContext(
  context: PendingSignatureContext,
): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(context));
  } catch {
    // localStorage no disponible (modo privado, cuota excedida, etc.) — el flujo de
    // registro/login sigue funcionando, solo sin la redirección automática al documento.
  }
}

export function getPendingSignatureContext(): PendingSignatureContext | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PendingSignatureContext>;
    if (
      typeof parsed.documentId !== 'string' ||
      typeof parsed.collaboratorId !== 'string' ||
      typeof parsed.email !== 'string'
    ) {
      return null;
    }
    return parsed as PendingSignatureContext;
  } catch {
    return null;
  }
}

export function clearPendingSignatureContext(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}
