'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup, FieldError } from '@/components/ui/field';
import { TextField } from '@/components/form/text-field';
import { getErrorMessage } from '@/lib/error-handler';
import { setAuthToken } from '@/lib/cookies';
import {
  getPendingRegistrationContext,
  setPendingRegistrationContext,
  clearPendingRegistrationContext,
  type PendingRegistrationContext,
} from '@/lib/pending-registration-context';
import { verifyOtpRequest, resendOtpRequest } from '../../_requests';
import { verifyOtpSchema, type VerifyOtpFormValues } from '../_schemas';

type ResendState = 'idle' | 'sending' | 'sent' | 'error';

export default function VerifyOtpForm() {
  const router = useRouter();
  const [context, setContext] = useState<PendingRegistrationContext | null>(
    null,
  );
  const [isReady, setIsReady] = useState(false);
  const [resendState, setResendState] = useState<ResendState>('idle');
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyOtpFormValues>({ resolver: zodResolver(verifyOtpSchema) });

  useEffect(() => {
    const stored = getPendingRegistrationContext();
    if (!stored) {
      // Llegó directo a la URL sin haberse registrado (o sin haber intentado loguearse con una
      // cuenta pendiente) — no hay a qué correo verificar.
      router.replace('/signup');
      return;
    }
    setContext(stored);
    setIsReady(true);
  }, [router]);

  async function onSubmit(values: VerifyOtpFormValues) {
    if (!context) return;

    setVerifyError(null);
    setIsVerifying(true);
    try {
      const result = await verifyOtpRequest(context.email, values.code);
      clearPendingRegistrationContext();
      setAuthToken(result.token);
      window.location.href = '/home';
    } catch (error) {
      setVerifyError(
        getErrorMessage(error, 'No se pudo verificar el código. Intenta de nuevo.'),
      );
      setIsVerifying(false);
    }
  }

  async function handleResend() {
    if (!context) return;

    setResendState('sending');
    try {
      const result = await resendOtpRequest(context.email);
      const nextContext: PendingRegistrationContext = {
        email: result.email,
        maskedEmail: result.maskedEmail,
        isNewPreRegistration: false,
      };
      setPendingRegistrationContext(nextContext);
      setContext(nextContext);
      setResendState('sent');
    } catch {
      setResendState('error');
    }
  }

  if (!isReady || !context) {
    return null;
  }

  return (
    <Card className="max-w-md w-full">
      <CardHeader>
        <CardTitle>Verifica tu correo</CardTitle>
      </CardHeader>
      <CardContent>
        {!context.isNewPreRegistration && (
          <div className="mb-4 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg px-4 py-2 text-sm dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900">
            Ya existía una solicitud de registro pendiente para esta CURP. Te
            reenviamos un código a <strong>{context.maskedEmail}</strong>.
          </div>
        )}

        <p className="mb-4 text-sm text-muted-foreground">
          Enviamos un código de verificación a{' '}
          <strong>{context.maskedEmail}</strong>. Ingrésalo para activar tu
          cuenta.
        </p>

        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            <TextField
              id="code"
              label="Código de verificación"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              error={errors.code}
              {...register('code')}
            />

            {verifyError && <FieldError>{verifyError}</FieldError>}

            <Button type="submit" disabled={isVerifying} className="w-full">
              {isVerifying ? 'Verificando...' : 'Verificar'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              disabled={resendState === 'sending'}
              onClick={handleResend}
              className="w-full"
            >
              {resendState === 'sending' ? 'Reenviando...' : 'Reenviar código'}
            </Button>

            {resendState === 'sent' && (
              <p className="text-sm text-center text-emerald-600">
                Te reenviamos un nuevo código.
              </p>
            )}
            {resendState === 'error' && (
              <p className="text-sm text-center text-destructive">
                No se pudo reenviar el código. Intenta de nuevo.
              </p>
            )}
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
