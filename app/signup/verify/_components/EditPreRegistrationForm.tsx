'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { TextField } from '@/components/form/text-field';
import { Form } from '@/components/form/form';
import { getErrorMessage } from '@/lib/error-handler';
import { useUpdatePreRegistration } from '../_hooks/useUpdatePreRegistration';
import {
  editPreRegistrationSchema,
  type EditPreRegistrationFormValues,
  type EditPreRegistrationValues,
} from '../_schemas';

const UPDATE_ERROR_MESSAGE =
  'No se pudieron actualizar tus datos. Intenta de nuevo.';

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
  const updatePreRegistration = useUpdatePreRegistration();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<
    EditPreRegistrationFormValues,
    unknown,
    EditPreRegistrationValues
  >({
    resolver: zodResolver(editPreRegistrationSchema),
    defaultValues: { email: currentEmail },
  });

  /**
   * El error del servidor se asigna al campo `email` en vez de guardarse en un estado propio: los
   * fallos reales de este endpoint hablan de ese campo ("ya existe un usuario con ese correo"),
   * así que el mensaje tiene que aparecer junto al input que hay que corregir. Además de moverlo
   * de lugar, eso lo vuelve accesible —`TextField` marca el input con `aria-invalid` y asocia el
   * mensaje— y hace que RHF lo limpie solo en el siguiente envío, sin tener que acordarse de
   * resetearlo a mano.
   *
   * `mutateAsync` y no `mutate` porque el resultado se necesita acá: `onUpdated` solo debe correr
   * si la corrección se guardó, y el `catch` es justamente lo que traduce el fallo al formulario.
   */
  async function onSubmit(values: EditPreRegistrationValues) {
    try {
      const result = await updatePreRegistration.mutateAsync({
        currentEmail,
        ...values,
      });
      onUpdated({ email: result.email, maskedEmail: result.maskedEmail });
    } catch (error) {
      setError(
        'email',
        { type: 'server', message: getErrorMessage(error, UPDATE_ERROR_MESSAGE) },
        { shouldFocus: true },
      );
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

        <Button
          type="submit"
          disabled={updatePreRegistration.isPending}
          className="w-full"
        >
          {updatePreRegistration.isPending
            ? 'Guardando...'
            : 'Guardar y enviar código'}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={updatePreRegistration.isPending}
          onClick={onCancel}
        >
          Cancelar
        </Button>
      </FieldGroup>
    </Form>
  );
}
