'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup, FieldError } from '@/components/ui/field';
import { TextField } from '@/components/form/text-field';
import { loginSchema, type LoginFormValues } from '../_schemas';
import { useLogin, getLoginErrorMessage } from '../_hooks/useLogin';

export default function LoginForm() {
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

            {loginMutation.isError && (
              <FieldError>{getLoginErrorMessage(loginMutation.error)}</FieldError>
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
