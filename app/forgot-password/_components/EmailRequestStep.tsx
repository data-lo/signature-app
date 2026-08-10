'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup, FieldError } from '@/components/ui/field';
import { TextField } from '@/components/form/text-field';
import { getErrorMessage } from '@/lib/error-handler';
import { forgotPasswordRequest } from '../_requests';
import { emailStepSchema, type EmailStepFormValues } from '../_schemas';
import { Form } from '@/components/form/form';

interface EmailRequestStepProps {
  onSuccess: (email: string) => void;
}

const GENERIC_SUCCESS_MESSAGE =
  'Si el correo está registrado, recibirás un código de verificación';

export default function EmailRequestStep({ onSuccess }: EmailRequestStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailStepFormValues>({ resolver: zodResolver(emailStepSchema) });

  async function onSubmit(values: EmailStepFormValues) {
    setRequestError(null);
    setIsSubmitting(true);
    try {
      await forgotPasswordRequest(values.email);
      toast.success(GENERIC_SUCCESS_MESSAGE);
      onSuccess(values.email);
    } catch (error) {
      setRequestError(
        getErrorMessage(error, 'Error de conexión con el servidor'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <CardHeader>
        <CardTitle>Recupera tu contraseña</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          Ingresa tu correo electrónico y te enviaremos un código para
          restablecer tu contraseña.
        </p>

        <Form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            <TextField
              id="email"
              label="Correo electrónico"
              type="email"
              autoComplete="email"
              error={errors.email}
              {...register('email')}
            />

            {requestError && <FieldError>{requestError}</FieldError>}

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Enviando...' : 'Enviar código'}
            </Button>
          </FieldGroup>
        </Form>
      </CardContent>
    </>
  );
}
