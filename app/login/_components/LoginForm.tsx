'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup, FieldError } from '@/components/ui/field';
import { TextField } from '@/components/form/text-field';
import { getPendingSignatureContext } from '@/lib/pending-signature-context';
import { getErrorMessage } from '@/lib/error-handler';
import { loginSchema, type LoginFormValues } from '../_schemas';
import { useLogin } from '../_hooks/useLogin';

export default function LoginForm() {
  const [hasPendingSignature, setHasPendingSignature] = useState(false);

  // localStorage solo existe en el cliente (ver historia "Notificación por Email para Firma
  // Simple y Vinculación de Cuenta", Caso C) — se lee tras el montaje para no generar un
  // mismatch de hidratación entre servidor y cliente.
  useEffect(() => {
    setHasPendingSignature(Boolean(getPendingSignatureContext()));
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const loginMutation = useLogin();

  return (
    <Card className="max-w-md w-full">
      <CardHeader>
        <CardTitle>Iniciar sesión</CardTitle>
      </CardHeader>
      <CardContent>
        {hasPendingSignature && (
          <div className="mb-4 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg px-4 py-2 text-sm dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900">
            Inicie sesión para firmar este documento con firma digital
            simple.
          </div>
        )}
        <form onSubmit={handleSubmit((values) => loginMutation.mutate(values))}>
          <FieldGroup>
            <TextField
              id="email"
              label="Correo electrónico"
              type="email"
              autoComplete="email"
              error={errors.email}
              {...register('email')}
            />

            <TextField
              id="password"
              label="Contraseña"
              type="password"
              autoComplete="current-password"
              error={errors.password}
              {...register('password')}
            />

            <p className="-mt-2 text-right text-sm">
              <Link
                href="/forgot-password"
                className="text-primary hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </p>

            {loginMutation.isError && (
              <FieldError>
                {getErrorMessage(
                  loginMutation.error,
                  'Error de conexión con el servidor',
                )}
              </FieldError>
            )}

            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full"
            >
              {loginMutation.isPending
                ? 'Iniciando sesión...'
                : 'Iniciar sesión'}
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              ¿No tienes una cuenta?{' '}
              <Link href="/signup" className="text-primary hover:underline">
                Regístrate
              </Link>
            </p>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
