'use client';

import { CheckCircle2, FileSignature } from 'lucide-react';
import { useSigningSession } from './SigningSessionProvider';
import type { SignatureFlowType, SigningSession } from './signing-session';

/** Cómo se nombra cada tipo de firma frente al firmante. */
export const SIGNATURE_FLOW_LABELS: Record<SignatureFlowType, string> = {
  SIMPLE: 'Simple',
  ADVANCED: 'e.firma (avanzada)',
  BIOMETRIC: 'Biometría',
};

interface SignerSummaryProps {
  session: SigningSession;
}

/**
 * Qué se va a firmar y con qué tipo de firma, arriba del flujo. Sólo muestra lo que resolvió el
 * backend; no hay nada editable. El correo enmascarado no va aquí: lo muestra el paso del código,
 * que es donde importa.
 *
 * @param props.session - Sesión activa.
 * @returns El resumen, o `null` si no se conoce el documento (de regreso de Didit).
 *
 * @example
 * ```tsx
 * <SignerSummary session={session} />
 * ```
 */
export default function SignerSummary({ session }: SignerSummaryProps) {
  const { result } = useSigningSession();
  const { document, signature } = session;
  if (!document.name) return null;

  return (
    <section
      aria-label="Resumen de la firma"
      className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border bg-background px-4 py-3"
    >
      <FileSignature className="size-5 text-muted-foreground" aria-hidden />
      <p className="min-w-0 flex-1 break-words text-sm font-medium">
        Vas a firmar: {document.name}
      </p>
      {signature.type && (
        <p className="text-xs text-muted-foreground">
          Tipo de firma: {SIGNATURE_FLOW_LABELS[signature.type]}
        </p>
      )}
      {result && (
        <p className="flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="size-4" aria-hidden />
          Firma registrada
        </p>
      )}
    </section>
  );
}
