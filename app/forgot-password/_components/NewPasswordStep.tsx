'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup, FieldError } from '@/components/ui/field';
import { PasswordInput } from '@/components/form/password-input';
import { getErrorMessage } from '@/lib/error-handler';
import { resetPasswordRequest } from '../_requests';
import { resetStepSchema, type ResetStepFormValues } from '../_schemas';
import { Form } from '@/components/form/form';

interface NewPasswordStepProps {
  resetToken: string;
  onSuccess: () => void;
}

export default function NewPasswordStep({
  resetToken,
  onSuccess,
}: NewPasswordStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetStepFormValues>({ resolver: zodResolver(resetStepSchema) });

  async function onSubmit(values: ResetStepFormValues) {
    setResetError(null);
    setIsSubmitting(true);
    try {
      await resetPasswordRequest(
        resetToken,
        values.newPassword,
        values.confirmPassword,
      );
      onSuccess();
    } catch (error) {
      setResetError(
        getErrorMessage(
          error,
          'No se pudo actualizar la contraseña. Intenta de nuevo.',
        ),
      );
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <CardHeader>
        <CardTitle>Nueva contraseña</CardTitle>
      </CardHeader>
      <CardContent>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            <PasswordInput
              id="newPassword"
              label="Nueva contraseña"
              autoComplete="new-password"
              error={errors.newPassword}
              {...register('newPassword')}
            />

            <PasswordInput
              id="confirmPassword"
              label="Confirmar contraseña"
              autoComplete="new-password"
              error={errors.confirmPassword}
              {...register('confirmPassword')}
            />

            {resetError && <FieldError>{resetError}</FieldError>}

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Actualizando...' : 'Actualizar contraseña'}
            </Button>
          </FieldGroup>
        </Form>
      </CardContent>
    </>
  );
}
