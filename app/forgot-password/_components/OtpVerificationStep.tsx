'use client';

import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel, FieldError, FieldGroup } from '@/components/ui/field';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { getErrorMessage } from '@/lib/error-handler';
import { forgotPasswordRequest, verifyResetCodeRequest } from '../_requests';
import { otpStepSchema, type OtpStepFormValues } from '../_schemas';
import { Form } from '@/components/form/form';

const RESEND_COOLDOWN_SECONDS = 30;

interface OtpVerificationStepProps {
  email: string;
  onSuccess: (resetToken: string) => void;
}

export default function OtpVerificationStep({
  email,
  onSuccess,
}: OtpVerificationStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'error'>(
    'idle',
  );
  const [cooldown, setCooldown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<OtpStepFormValues>({
    resolver: zodResolver(otpStepSchema),
    defaultValues: { code: '' },
  });

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    intervalRef.current = setInterval(() => {
      setCooldown((current) => {
        if (current <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  }

  async function onSubmit(values: OtpStepFormValues) {
    setVerifyError(null);
    setIsSubmitting(true);
    try {
      const { resetToken } = await verifyResetCodeRequest(email, values.code);
      onSuccess(resetToken);
    } catch (error) {
      setVerifyError(
        getErrorMessage(error, 'Código de verificación inválido o expirado'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    setResendState('sending');
    try {
      await forgotPasswordRequest(email);
      setResendState('idle');
      startCooldown();
    } catch {
      setResendState('error');
    }
  }

  return (
    <>
      <CardHeader>
        <CardTitle>Verifica tu código</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          Enviamos un código de verificación a <strong>{email}</strong>.
          Ingrésalo para continuar.
        </p>

        <Form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            <Field data-invalid={errors.code ? true : undefined}>
              <FieldLabel htmlFor="code">Código de verificación</FieldLabel>
              <Controller
                control={control}
                name="code"
                render={({ field }) => (
                  <InputOTP
                    id="code"
                    maxLength={6}
                    value={field.value}
                    onChange={field.onChange}
                    aria-label="Código de verificación"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                )}
              />
              <FieldError errors={errors.code ? [errors.code] : undefined} />
            </Field>

            {verifyError && <FieldError>{verifyError}</FieldError>}

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Verificando...' : 'Verificar código'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              disabled={resendState === 'sending' || cooldown > 0}
              onClick={handleResend}
              className="w-full"
            >
              {cooldown > 0
                ? `Reenviar código (${cooldown}s)`
                : resendState === 'sending'
                  ? 'Reenviando...'
                  : 'Reenviar código'}
            </Button>

            {resendState === 'error' && (
              <p className="text-sm text-center text-destructive">
                No se pudo reenviar el código. Intenta de nuevo.
              </p>
            )}
          </FieldGroup>
        </Form>
      </CardContent>
    </>
  );
}
