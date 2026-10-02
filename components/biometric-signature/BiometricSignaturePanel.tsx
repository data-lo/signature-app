'use client';

import { useId, useState } from 'react';
import { CheckCircle2, Loader2, ScanFace } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { BiometricSignatureStatus } from '@/lib/enums/document';
import type { BiometricSignatureSession } from '@/lib/biometric-signature';
import VerificationQrPanel from '@/app/dashboard/personal-documents/identity/_components/VerificationQrPanel';

/**
 * Lo que la pantalla muestra de la firma biométrica: los seis estados que pide la historia
 * (pendiente, en captura, aprobada, rechazada, expirada y reintento), más "sin iniciar" y "firmada".
 */
export type BiometricSignatureViewKind =
  | 'idle'
  | 'pending'
  | 'capturing'
  | 'approved'
  | 'signed'
  | 'declined'
  | 'expired'
  | 'retry';

/**
 * Traduce el último intento a lo que se dibuja.
 *
 * `signed` cuando la firma ya quedó registrada, aunque el intento siga diciendo APPROVED: la
 * aprobación sola todavía no es una firma. FAILED es "reintento": la sesión no pudo crearse, o la
 * aprobación llegó pero la firma no pudo registrarse.
 *
 * @param session - Último intento, o `null`/`undefined` si no hay.
 * @returns El estado de la vista.
 *
 * @example
 * ```ts
 * toBiometricSignatureViewKind({ status: 'IN_PROGRESS', signatureCompleted: false, … }); // 'capturing'
 * ```
 */
export function toBiometricSignatureViewKind(
  session: BiometricSignatureSession | null | undefined,
): BiometricSignatureViewKind {
  if (!session) return 'idle';
  if (session.signatureCompleted) return 'signed';

  switch (session.status) {
    case BiometricSignatureStatus.Pending:
      return 'pending';
    case BiometricSignatureStatus.InProgress:
      return 'capturing';
    case BiometricSignatureStatus.Approved:
      return 'approved';
    case BiometricSignatureStatus.Declined:
      return 'declined';
    case BiometricSignatureStatus.Expired:
      return 'expired';
    default:
      return 'retry';
  }
}

/** Mensaje de cada desenlace que obliga a empezar de nuevo. */
const RETRY_MESSAGES: Partial<Record<BiometricSignatureViewKind, string>> = {
  declined:
    'La verificación biométrica fue rechazada. Puedes intentarlo de nuevo con buena luz y el rostro descubierto.',
  expired:
    'La sesión de verificación expiró o se abandonó antes de completarse. Inicia una nueva para firmar.',
  retry:
    'No se pudo completar la firma biométrica. Inténtalo de nuevo; si el problema continúa, contacta a soporte.',
};

export interface BiometricSigningProps {
  /** Último intento conocido; `null` si nunca se inició. */
  session: BiometricSignatureSession | null;
  /** Primera carga del estado: todavía no se sabe si hay una sesión abierta. */
  isLoading: boolean;
  /** Motivo por el que la ubicación no pudo obtenerse; bloquea el inicio hasta corregirlo. */
  geoBlockedReason: string | null;
  isRequestingLocation: boolean;
  isStarting: boolean;
  /** Pide la ubicación e inicia (o reinicia) la sesión con Didit. Sólo se llama con consentimiento. */
  onStart: () => void;
  /**
   * Qué validará Didit, para el texto del consentimiento: el rostro contra la identidad ya
   * verificada (`identity`) o una identificación oficial más el rostro (`document`, invitados).
   */
  verificationScope: 'identity' | 'document';
}

/**
 * Acción y seguimiento de la firma biométrica: consentimiento, "Firmar con biometría", el QR de
 * Didit mientras la prueba está en curso, y el desenlace. Sirve al firmante con cuenta y al
 * invitado.
 *
 * Esta pantalla nunca decide el resultado: lo que muestra sale del backend, que lo recibe por el
 * webhook de Didit. Volver de Didit al navegador no aprueba nada.
 */
export default function BiometricSignaturePanel({
  session,
  isLoading,
  geoBlockedReason,
  isRequestingLocation,
  isStarting,
  onStart,
  verificationScope,
}: BiometricSigningProps) {
  const consentId = useId();
  const [consented, setConsented] = useState(false);
  const kind = toBiometricSignatureViewKind(session);
  const isBusy = isRequestingLocation || isStarting;

  if (isLoading) {
    return (
      <p
        role="status"
        className="flex items-center gap-2 text-sm text-muted-foreground"
      >
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Consultando la firma biométrica...
      </p>
    );
  }

  const startBlock = (label: string) => (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <Checkbox
          id={consentId}
          checked={consented}
          onCheckedChange={(checked) => setConsented(checked === true)}
          disabled={isBusy}
        />
        <Label htmlFor={consentId} className="text-xs leading-snug font-normal">
          {verificationScope === 'identity'
            ? 'Acepto que se capture mi rostro en vivo y se compare con mi identidad verificada para autorizar esta firma.'
            : 'Acepto que se capture una identificación oficial y mi rostro en vivo, y que se comparen entre sí, para autorizar esta firma.'}{' '}
          Los resultados se conservan como evidencia de la firma; las imágenes
          no se guardan en esta plataforma.
        </Label>
      </div>
      <p className="text-xs text-muted-foreground">
        También solicitaremos tu ubicación para registrarla como parte de la
        evidencia de esta firma.
      </p>
      {geoBlockedReason && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          No se puede firmar sin tu ubicación: {geoBlockedReason}. Habilita el
          permiso de ubicación en tu navegador y vuelve a intentarlo.
        </div>
      )}
      <Button
        type="button"
        className="w-full"
        disabled={isBusy || !consented}
        onClick={onStart}
      >
        <ScanFace className="size-4" aria-hidden />
        {isRequestingLocation
          ? 'Obteniendo ubicación...'
          : isStarting
            ? 'Preparando verificación...'
            : label}
      </Button>
    </div>
  );

  if (kind === 'idle') {
    return startBlock('Firmar con biometría');
  }

  if (kind === 'declined' || kind === 'expired' || kind === 'retry') {
    return (
      <div className="flex flex-col gap-3">
        <p
          role="alert"
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
        >
          {RETRY_MESSAGES[kind]}
        </p>
        {startBlock('Volver a intentar')}
      </div>
    );
  }

  if (kind === 'signed') {
    return (
      <p
        role="status"
        className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400"
      >
        <CheckCircle2 className="size-4" aria-hidden />
        Tu firma biométrica quedó registrada.
      </p>
    );
  }

  if (kind === 'approved') {
    return (
      <p
        role="status"
        className="flex items-center gap-2 text-sm text-muted-foreground"
      >
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Verificación aprobada. Registrando tu firma...
      </p>
    );
  }

  // Pendiente o en captura.
  return (
    <div className="flex flex-col gap-3">
      <p role="status" className="text-sm font-medium">
        {kind === 'pending'
          ? 'Verificación biométrica pendiente'
          : 'Verificación biométrica en captura'}
      </p>
      {session?.url ? (
        <VerificationQrPanel url={session.url} />
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {kind === 'capturing'
            ? 'Estamos esperando el resultado. Esta pantalla se actualizará sola.'
            : 'Preparando la sesión de verificación...'}
        </p>
      )}
    </div>
  );
}
