'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getErrorMessage } from '@/lib/error-handler';
import {
  requestInvitationCodeRequest,
  verifyInvitationCodeRequest,
} from './invitation-requests';

interface InvitationCodeStepProps {
  /** Nombre del documento, si se conoce. */
  documentName?: string;
  /** Correo de la invitación, enmascarado por el backend. Nunca se pide ni se edita aquí. */
  maskedEmail: string;
  /** Se llama cuando el código es válido: el backend ya dejó la cookie de la sesión. */
  onVerified: () => void;
}

/**
 * Validación del correo de la invitación, ANTES de ver el documento o firmar. Igual para los dos
 * orígenes (correo y portal del tercero): el código siempre va al correo guardado de la invitación,
 * que aquí sólo se muestra enmascarado. Quien abra un enlace ajeno no recibe el código.
 *
 * @param props - Documento, correo enmascarado y aviso de validación.
 * @returns El paso del código.
 *
 * @example
 * ```tsx
 * <InvitationCodeStep maskedEmail="a***@correo.com" onVerified={openSession} />
 * ```
 */
export default function InvitationCodeStep({
  documentName,
  maskedEmail,
  onVerified,
}: InvitationCodeStepProps) {
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [emailDelivered, setEmailDelivered] = useState(true);
  const request = useMutation({
    mutationFn: requestInvitationCodeRequest,
    onSuccess: (data) => {
      setSent(true);
      setEmailDelivered(data.emailDelivered);
    },
  });
  const verify = useMutation({
    mutationFn: verifyInvitationCodeRequest,
    onSuccess: () => onVerified(),
  });

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader className="gap-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Confirma tu correo
        </p>
        <CardTitle className="break-words">
          {documentName
            ? `Vas a firmar: ${documentName}`
            : 'Firma de documento'}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm">
          Para proteger tu firma, enviaremos un código de 6 dígitos a{' '}
          <span className="font-medium">{maskedEmail}</span>. Sin él no se
          muestra el documento.
        </p>

        {request.isError && (
          <p role="alert" className="text-xs text-destructive">
            {getErrorMessage(request.error, 'No pudimos enviar el código.')}
          </p>
        )}

        {!sent ? (
          <Button
            type="button"
            disabled={request.isPending}
            onClick={() => request.mutate()}
          >
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
            {emailDelivered ? (
              <p role="status" className="text-xs text-muted-foreground">
                Te enviamos el código a {maskedEmail}. Revisa también tu carpeta
                de correo no deseado.
              </p>
            ) : (
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
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, ''))
              }
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
              onClick={() => request.mutate()}
            >
              Reenviar código
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
