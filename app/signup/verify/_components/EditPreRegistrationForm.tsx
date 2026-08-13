'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { FieldGroup, FieldError } from '@/components/ui/field';
import { TextField } from '@/components/form/text-field';
import { Form } from '@/components/form/form';
import { getErrorMessage } from '@/lib/error-handler';
import { updatePreRegistrationRequest } from '../../_requests';
import {
  editPreRegistrationSchema,
  type EditPreRegistrationFormValues,
  type EditPreRegistrationValues,
} from '../_schemas';

interface EditPreRegistrationFormProps {
  /** Correo con el que se hizo el registro; identifica el pre-registro a corregir. */
  currentEmail: string;
  onUpdated: (result: { email: string; maskedEmail: string }) => void;
  onCancel: () => void;
}

/**
 * Corrección de los datos del registro mientras el correo sigue sin verificar (ver historia
 * "Permitir corregir datos antes de verificar el correo").
 *
 * El correo viene precargado con el que se usó al registrarse —típicamente el que tiene el error,
 * para que se corrija en vez de reescribirse— y la contraseña es lo que autoriza el cambio: es el
 * único secreto que existe antes de verificar, porque el código nunca llegó si el correo estaba
 * mal. Los datos personales quedan opcionales para no obligar a reescribir CURP y RFC a quien
 * solo se equivocó en el correo.
 */
export default function EditPreRegistrationForm({
  currentEmail,
  onUpdated,
  onCancel,
}: EditPreRegistrationFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<
    EditPreRegistrationFormValues,
    unknown,
    EditPreRegistrationValues
  >({
    resolver: zodResolver(editPreRegistrationSchema),
    defaultValues: { email: currentEmail },
  });

  async function onSubmit(values: EditPreRegistrationValues) {
    setSubmitError(null);
    setIsSaving(true);
    try {
      const result = await updatePreRegistrationRequest({
        currentEmail,
        ...values,
      });
      onUpdated({ email: result.email, maskedEmail: result.maskedEmail });
    } catch (error) {
      setSubmitError(
        getErrorMessage(
          error,
          'No se pudieron actualizar tus datos. Intenta de nuevo.',
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Form onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        <TextField
          id="edit-email"
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          error={errors.email}
          {...register('email')}
        />

        <TextField
          id="edit-password"
          label="Contraseña de tu registro"
          type="password"
          autoComplete="current-password"
          error={errors.password}
          {...register('password')}
        />

        <p className="text-xs text-muted-foreground">
          Los siguientes datos son opcionales: si los dejas vacíos se quedan
          como están.
        </p>

        <TextField
          id="edit-firstName"
          label="Nombre(s)"
          error={errors.firstName}
          {...register('firstName')}
        />

        <TextField
          id="edit-lastName"
          label="Apellidos"
          error={errors.lastName}
          {...register('lastName')}
        />

        <TextField
          id="edit-nationalId"
          label="CURP"
          maxLength={18}
          error={errors.nationalId}
          {...register('nationalId')}
        />

        <TextField
          id="edit-rfc"
          label="RFC"
          maxLength={13}
          error={errors.rfc}
          {...register('rfc')}
        />

        {submitError && <FieldError>{submitError}</FieldError>}

        <Button type="submit" disabled={isSaving} className="w-full">
          {isSaving ? 'Guardando...' : 'Guardar y enviar código'}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={isSaving}
          onClick={onCancel}
        >
          Cancelar
        </Button>
      </FieldGroup>
    </Form>
  );
}
