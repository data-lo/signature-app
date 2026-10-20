'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getErrorMessage } from '@/lib/error-handler';
import { maskEmail } from '../../biometric-signature/_components/GuestAccessCodeStep';
import type { GuestAccess, GuestInvitation } from '../_requests';
import {
  useRequestGuestAdvancedAccessCode,
  useVerifyGuestAdvancedAccessCode,
} from '../_hooks/useGuestAdvancedSignature';

interface GuestAdvancedAccessCodeStepProps {
  documentId: string;
  invitation: GuestInvitation;
  /** Acceso canjeado: quien monta este paso lo guarda y avanza. */
  onVerified: (access: GuestAccess) => void;
}

/**
 * Paso del invitado que firma sin cuenta: acreditar que controla el correo de la invitación con un
 * código que le llega ahí. El código sólo acredita el correo; lo que autoriza la firma es el acceso
 * temporal que se emite al canjearlo.
 *
 * Mismo recorrido que el paso biométrico (`GuestAccessCodeStep`), contra los endpoints de Firma
 * Avanzada: los dos códigos y los dos accesos son independientes.
 */
export default function GuestAdvancedAccessCodeStep({
  documentId,
  invitation,
  onVerified,
}: GuestAdvancedAccessCodeStepProps) {
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [emailDelivered, setEmailDelivered] = useState(true);
  const request = useRequestGuestAdvancedAccessCode(documentId, invitation);
  const verify = useVerifyGuestAdvancedAccessCode(
    documentId,
    invitation,
    onVerified,
  );

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
      <p className="text-sm">
        Enviaremos un código de 6 dígitos a{' '}
        <span className="font-medium">{maskEmail(invitation.email)}</span> para
        confirmar que recibiste esta invitación.
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
