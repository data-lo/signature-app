'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup, FieldError } from '@/components/ui/field';
import { TextField } from '@/components/form/text-field';
import {
  TurnstileWidget,
  type TurnstileWidgetHandle,
} from '@/components/form/turnstile-widget';
import { getPendingSignatureContext } from '@/lib/pending-signature-context';
import { getErrorMessage } from '@/lib/error-handler';
import { registerSchema, type RegisterFormValues } from '../_schemas';
import { useRegister } from '../_hooks/useRegister';
import { Form } from '@/components/form/form';
import { formatPersonName } from '@/lib/format-person-name';

interface SignupFormProps {
  /** Prellenado cuando se llega desde /join con un RFC nuevo (ver Escenario 4 de la historia). */
  defaultRfc?: string;
  /** Presente cuando se llega desde /join — une automáticamente al registrarse. */
  invitationToken?: string;
  /** Clave pública de Cloudflare Turnstile, leída en el servidor (ver `app/signup/page.tsx`). */
  turnstileSiteKey?: string;
}

const CAPTCHA_REQUIRED_MESSAGE =
  'Completa la verificación anti-bots para crear tu cuenta.';

export default function SignupForm({
  defaultRfc,
  invitationToken,
  turnstileSiteKey,
}: SignupFormProps) {
  const [hasPendingSignature, setHasPendingSignature] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);

  const useFormInstance = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { rfc: defaultRfc ?? '' },
  });
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useFormInstance;

  // Ver historia "Notificación por Email para Firma Simple y Vinculación de Cuenta" (Caso B):
  // localStorage solo existe en el cliente, así que el prellenado ocurre tras el montaje en vez
  // de en defaultValues (evita un mismatch de hidratación entre servidor y cliente).
  useEffect(() => {
    const context = getPendingSignatureContext();
    if (context?.email) {
      setValue('email', context.email);
      setHasPendingSignature(true);
    }
  }, [setValue]);

  /**
   * Un token de Turnstile solo se puede canjear una vez: si el registro falla (por el CAPTCHA o
   * por cualquier otra cosa, como un CURP repetido), el token que ya viajó al backend queda
   * quemado y hay que pedir un reto nuevo antes de que el usuario reintente.
   */
  const resetTurnstile = useCallback(() => {
    setTurnstileToken(null);
    turnstileRef.current?.reset();
  }, []);

  const registerMutation = useRegister({ onError: resetTurnstile });

  const submitRegistration = (values: RegisterFormValues) => {
    if (!turnstileToken) {
      setTurnstileError(CAPTCHA_REQUIRED_MESSAGE);
      return;
    }

    setTurnstileError(null);
    registerMutation.mutate({ ...values, invitationToken, turnstileToken });
  };

  return (
    <Card className="max-w-md w-full">
      <CardHeader>
        <CardTitle>Crear cuenta</CardTitle>
      </CardHeader>
      <CardContent>
        {hasPendingSignature && (
          <div className="mb-4 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg px-4 py-2 text-sm dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900">
            Por favor, cree una cuenta si aún no la tiene para proceder con la
            firma del documento.
          </div>
        )}
        <Form onSubmit={handleSubmit(submitRegistration)}>
          <FieldGroup>
            <TextField
              id="firstName"
              label="Nombre(s)"
              autoComplete="given-name"
              error={errors.firstName}
              {...registerField('firstName', {
                onBlur: (event) =>
                  setValue('firstName', formatPersonName(event.target.value)),
              })}
            />

            <TextField
              id="lastName"
              label="Apellidos"
              autoComplete="family-name"
              error={errors.lastName}
              {...registerField('lastName', {
                onBlur: (event) =>
                  setValue('lastName', formatPersonName(event.target.value)),
              })}
            />

            <TextField
              id="email"
              label="Correo electrónico"
              type="email"
              autoComplete="email"
              error={errors.email}
              {...registerField('email')}
            />

            <TextField
              id="nationalId"
              label="CURP"
              maxLength={18}
              error={errors.nationalId}
              {...registerField('nationalId')}
            />

            <TextField
              id="rfc"
              label="RFC"
              maxLength={13}
              error={errors.rfc}
              {...registerField('rfc')}
            />

            <TextField
              id="password"
              label="Contraseña"
              type="password"
              autoComplete="new-password"
              error={errors.password}
              {...registerField('password')}
            />

            <TextField
              id="confirmPassword"
              label="Confirmar contraseña"
              type="password"
              autoComplete="new-password"
              error={errors.confirmPassword}
              {...registerField('confirmPassword')}
            />

            <TurnstileWidget
              ref={turnstileRef}
              siteKey={turnstileSiteKey}
              onVerify={(token) => {
                setTurnstileToken(token);
                setTurnstileError(null);
              }}
              onExpire={() => {
                setTurnstileToken(null);
                setTurnstileError(CAPTCHA_REQUIRED_MESSAGE);
              }}
              onError={() => setTurnstileToken(null)}
            />

            {turnstileError && <FieldError>{turnstileError}</FieldError>}

            {registerMutation.isError && (
              <FieldError>
                {getErrorMessage(
                  registerMutation.error,
                  'Ocurrió un error al crear tu cuenta. Intenta de nuevo.',
                )}
              </FieldError>
            )}

            <Button
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full"
            >
              {registerMutation.isPending
                ? 'Creando cuenta...'
                : 'Crear cuenta'}
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              ¿Ya tienes una cuenta?{' '}
              <Link href="/login" className="text-primary hover:underline">
                Inicia sesión
              </Link>
            </p>
          </FieldGroup>
        </Form>
      </CardContent>
    </Card>
  );
}
