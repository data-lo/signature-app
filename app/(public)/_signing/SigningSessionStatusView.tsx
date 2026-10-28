'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { SigningSessionStatus } from './signing-session';

/** Estados que no montan un flujo, más `UNSUPPORTED` (tipo de firma sin flujo registrado). */
export type SigningStatusViewKind =
  Exclude<SigningSessionStatus, 'ACTIVE'> | 'UNSUPPORTED';

/** Título y texto de cada estado. Nunca mencionan el documento: un enlace muerto no lo publica. */
export const SIGNING_STATUS_COPY: Record<
  Exclude<SigningStatusViewKind, 'LOADING'>,
  { title: string; message: string }
> = {
  INVALID: {
    title: 'Invitación inválida',
    message:
      'Este enlace de firma no es válido. Verifica que lo abriste completo desde el correo de invitación.',
  },
  EXPIRED: {
    title: 'Invitación vencida',
    message:
      'Este enlace de firma ya venció. Pide a quien te envió el documento una nueva invitación.',
  },
  REVOKED: {
    title: 'Invitación revocada',
    message:
      'Este enlace de firma ya no es válido porque se reemplazó o se retiró. Usa el enlace más reciente que recibiste.',
  },
  ALREADY_SIGNED: {
    title: 'Firma completada',
    message:
      'Esta invitación ya no tiene una firma pendiente: el documento ya se firmó. Puedes cerrar esta página.',
  },
  DOCUMENT_CANCELLED: {
    title: 'Documento cancelado',
    message:
      'El documento de esta invitación se canceló y ya no se puede firmar.',
  },
  UNAVAILABLE: {
    title: 'Documento no disponible para firma',
    message:
      'Este documento no tiene una firma pendiente para esta invitación en este momento.',
  },
  WAITING_FOR_PREVIOUS_SIGNER: {
    title: 'Todavía no es tu turno',
    message:
      'Este documento se firma en orden y falta la firma de alguien antes que tú. Te avisaremos por correo cuando sea tu turno; entonces vuelve a abrir tu enlace.',
  },
  ACCOUNT_REQUIRED: {
    title: 'Firma desde tu cuenta',
    message:
      'Esta invitación está vinculada a tu cuenta de Firmalo. Inicia sesión en la plataforma para firmar el documento.',
  },
  SESSION_EXPIRED: {
    title: 'Tu sesión de firma venció',
    message:
      'Por seguridad, la sesión de firma dura poco. Vuelve a abrir el enlace de tu invitación y confirma de nuevo tu correo.',
  },
  UNSUPPORTED: {
    title: 'Tipo de firma no disponible',
    message:
      'Este documento usa un tipo de firma que todavía no se puede completar desde esta página. Contacta a quien te lo envió.',
  },
  ERROR: {
    title: 'No pudimos cargar tu invitación',
    message:
      'Ocurrió un problema inesperado al consultar tu invitación. Intenta de nuevo en unos momentos.',
  },
};

interface SigningSessionStatusViewProps {
  kind: SigningStatusViewKind;
  /** Reintento; sólo se ofrece en `ERROR`. */
  onRetry?: () => void;
}

/**
 * Estado controlado de la pantalla pública de firma: carga, invitación inválida, vencida,
 * revocada, firma completada, documento cancelado o no disponible, tipo de firma no soportado o
 * error inesperado. Ninguno muestra el PDF ni datos del documento.
 *
 * @param props.kind - Estado a mostrar.
 * @param props.onRetry - Reintento para `ERROR`.
 * @returns La tarjeta del estado.
 *
 * @example
 * ```tsx
 * <SigningSessionStatusView kind="EXPIRED" />
 * ```
 */
export default function SigningSessionStatusView({
  kind,
  onRetry,
}: SigningSessionStatusViewProps) {
  if (kind === 'LOADING') {
    return (
      <p
        role="status"
        className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"
      >
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Validando invitación...
      </p>
    );
  }

  const { title, message } = SIGNING_STATUS_COPY[kind];

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p
          role={kind === 'ERROR' ? 'alert' : 'status'}
          className="text-sm text-muted-foreground"
        >
          {message}
        </p>
        {kind === 'ERROR' && onRetry && (
          <Button type="button" variant="outline" onClick={onRetry}>
            Reintentar
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
