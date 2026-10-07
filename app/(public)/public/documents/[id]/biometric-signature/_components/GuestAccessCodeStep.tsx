'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getErrorMessage } from '@/lib/error-handler';
import type { GuestAccess, GuestInvitation } from '../_requests';
import {
  useRequestGuestAccessCode,
  useVerifyGuestAccessCode,
} from '../_hooks/useGuestBiometricSignature';

interface GuestAccessCodeStepProps {
  documentId: string;
  invitation: GuestInvitation;
  /** Acceso canjeado: quien monta este paso lo guarda y avanza. */
  onVerified: (access: GuestAccess) => void;
  /** Aviso a mostrar arriba (p. ej. "tu acceso venció"), o `null`. */
  notice: string | null;
}

/**
 * Oculta el correo dejando la primera letra y el dominio, para confirmar a dónde va el código sin
 * mostrarlo completo en una pantalla que alguien más puede estar viendo.
 *
 * @param email - Correo de la invitación.
 * @returns El correo enmascarado.
 *
 * @example
 * ```ts
 * maskEmail('ana.lopez@correo.mx'); // 'a•••@correo.mx'
 * ```
 */
export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!user || !domain) return email;
  return `${user[0]}•••@${domain}`;
}

/**
 * Primer paso del invitado sin cuenta: demostrar que controla el correo de la invitación con un
 * código que le llega ahí. El enlace del correo, por sí solo, no da acceso a nada.
 *
 * No pide registrarse ni iniciar sesión.
 */
export default function GuestAccessCodeStep({
  documentId,
  invitation,
  onVerified,
  notice,
}: GuestAccessCodeStepProps) {
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [emailDelivered, setEmailDelivered] = useState(true);
  const request = useRequestGuestAccessCode(documentId, invitation);
  const verify = useVerifyGuestAccessCode(documentId, invitation, onVerified);

  function sendCode() {
    request.mutate(undefined, {
      onSuccess: (data) => {
        setSent(true);
        setEmailDelivered(data.emailDelivered);
      },
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {notice && (
        <p
          role="alert"
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
        >
          {notice}
        </p>
      )}

      <p className="text-sm">
        Para firmar sin crear una cuenta, confirma que recibiste esta
        invitación. Enviaremos un código de 6 dígitos a{' '}
        <span className="font-medium">{maskEmail(invitation.email)}</span>.
      </p>

      {!sent ? (
        <Button type="button" disabled={request.isPending} onClick={sendCode}>
          <Mail className="size-4" aria-hidden />
          {request.isPending ? 'Enviando código...' : 'Enviar código'}
        </Button>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            verify.mutate(code.trim());
          }}
        >
          {!emailDelivered && (
            <p role="alert" className="text-xs text-destructive">
              El código se generó, pero no pudimos enviar el correo. Solicita
              otro en unos momentos.
            </p>
          )}
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="Código de 6 dígitos"
            aria-label="Código de verificación"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
          />
          {verify.isError && (
            <p role="alert" className="text-xs text-destructive">
              {getErrorMessage(verify.error, 'El código no es válido.')}
            </p>
          )}
          <Button
            type="submit"
            disabled={verify.isPending || code.trim().length !== 6}
          >
            {verify.isPending ? 'Verificando...' : 'Verificar código'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={request.isPending}
            onClick={sendCode}
          >
            Reenviar código
          </Button>
        </form>
      )}
    </div>
  );
}
