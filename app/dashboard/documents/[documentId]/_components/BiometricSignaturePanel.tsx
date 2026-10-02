'use client';

import { Loader2, ScanFace } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BiometricSignatureStatus } from '@/lib/enums/document';
import VerificationQrPanel from '@/app/dashboard/personal-documents/identity/_components/VerificationQrPanel';
import type { BiometricSignatureSession } from '../_requests';

/**
 * Lo que la pantalla muestra de la firma biométrica: los seis estados que pide la historia
 * (pendiente, en proceso, aprobada, rechazada, expirada y reintento), más "sin iniciar".
 */
export type BiometricSignatureViewKind =
  | 'idle'
  | 'pending'
  | 'inProgress'
  | 'approved'
  | 'declined'
  | 'expired'
  | 'retry';

/**
 * Traduce el estado del intento a lo que se dibuja.
 *
 * IN_REVIEW se muestra como "en proceso": para el firmante no hay nada distinto que hacer, sólo
 * esperar. ABANDONED se agrupa con EXPIRED porque los dos se resuelven igual, abriendo otra sesión.
 * FAILED es "reintento": la sesión no pudo crearse o la firma no pudo registrarse.
 *
 * @param session - Último estado conocido, o `null`/`undefined` si no hay intento.
 * @returns El estado de la vista.
 *
 * @example
 * ```ts
 * toBiometricSignatureViewKind({ status: 'IN_REVIEW', … }); // 'inProgress'
 * ```
 */
export function toBiometricSignatureViewKind(
  session: BiometricSignatureSession | null | undefined,
): BiometricSignatureViewKind {
  if (!session) return 'idle';

  switch (session.status) {
    case BiometricSignatureStatus.Pending:
      return 'pending';
    case BiometricSignatureStatus.InProgress:
    case BiometricSignatureStatus.InReview:
      return 'inProgress';
    case BiometricSignatureStatus.Approved:
      return 'approved';
    case BiometricSignatureStatus.Declined:
      return 'declined';
    case BiometricSignatureStatus.Expired:
    case BiometricSignatureStatus.Abandoned:
      return 'expired';
    default:
      return 'retry';
  }
}

/** Mensaje y tono de cada desenlace que obliga a empezar de nuevo. */
const RETRY_MESSAGES: Partial<Record<BiometricSignatureViewKind, string>> = {
  declined:
    'La verificación biométrica fue rechazada. Puedes intentarlo de nuevo con buena luz y el rostro descubierto.',
  expired:
    'La sesión de verificación expiró antes de completarse. Inicia una nueva para firmar.',
  retry:
    'No se pudo completar la firma biométrica. Inténtalo de nuevo; si el problema continúa, contacta a soporte.',
};

export interface BiometricSigningProps {
  /** Último estado conocido del intento; `null` si nunca se inició. */
  session: BiometricSignatureSession | null;
  /** Primera carga del estado: todavía no se sabe si hay una sesión abierta. */
  isLoading: boolean;
  /** Motivo por el que la ubicación no pudo obtenerse; bloquea el inicio hasta corregirlo. */
  geoBlockedReason: string | null;
  isRequestingLocation: boolean;
  isStarting: boolean;
  /** Pide la ubicación e inicia (o reinicia) la sesión con Didit. */
  onStart: () => void;
}

/**
 * Acción y seguimiento de la firma biométrica: "Firmar con biometría", el QR de Didit mientras la
 * prueba está en curso, y el desenlace.
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
}: BiometricSigningProps) {
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

  const startButton = (label: string) => (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        Al continuar, solicitaremos tu ubicación para registrarla como parte de
        la evidencia de esta firma, y te pediremos una prueba de vida con tu
        rostro.
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
        disabled={isBusy}
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
    return startButton('Firmar con biometría');
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
        {startButton('Volver a intentar')}
      </div>
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

  // Pendiente o en proceso.
  return (
    <div className="flex flex-col gap-3">
      <p role="status" className="text-sm font-medium">
        {kind === 'pending'
          ? 'Verificación biométrica pendiente'
          : session?.status === BiometricSignatureStatus.InReview
            ? 'Tu verificación está en revisión'
            : 'Verificación biométrica en proceso'}
      </p>
      {session?.url ? (
        <VerificationQrPanel url={session.url} />
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {session?.status === BiometricSignatureStatus.InReview
            ? 'Estamos esperando el resultado. Esta pantalla se actualizará sola.'
            : 'Preparando la sesión de verificación...'}
        </p>
      )}
    </div>
  );
}
