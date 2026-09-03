'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FieldGroup } from '@/components/ui/field';
import { Form } from '@/components/form/form';
import { PasswordInput } from '@/components/form/password-input';
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from '../_schemas';
import { useChangePassword } from '../_hooks/useChangePassword';

const EMPTY_FORM: ChangePasswordFormValues = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

/**
 * Tarjeta "Contraseña" de Información personal: cambia la credencial de acceso acreditándose con
 * la actual (`PUT /users/me/password`).
 *
 * Vive en su propia tarjeta, debajo de "Mi información", en vez de dentro de ella: son dos
 * guardados independientes contra endpoints distintos, y mezclarlos obligaría a un único
 * "Guardar" a decidir qué mandar. Comparte la temática visual del resto de la configuración
 * (misma `Card`, mismo ancho).
 *
 * El formulario arranca vacío y vuelve a estarlo tras guardar: no hay "estado inicial" que
 * mostrar —una contraseña no se lee—, así que el estado inicial ES el formulario en blanco. De
 * ahí que `isDirty` sirva como "hay un cambio respecto de lo que había" y, junto con `isValid`,
 * gobierne el botón.
 */
export default function PasswordCard() {
  const changeMutation = useChangePassword();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid, isDirty },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onChange',
    defaultValues: EMPTY_FORM,
  });

  function onSubmit(values: ChangePasswordFormValues) {
    // Los campos se limpian solo si el guardado salió bien: si el backend rechaza la contraseña
    // actual, vaciarlos obligaría a reescribir las tres para reintentar.
    changeMutation.mutate(values, { onSuccess: () => reset(EMPTY_FORM) });
  }

  return (
    <Card id="password" className="w-full max-w-xl scroll-mt-6">
      <CardHeader>
        <CardTitle>Contraseña</CardTitle>
        <CardDescription>
          Para cambiarla necesitas escribir la contraseña que usas hoy.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            <PasswordInput
              id="currentPassword"
              label="Contraseña actual"
              autoComplete="current-password"
              error={errors.currentPassword}
              {...register('currentPassword')}
            />

            <PasswordInput
              id="newPassword"
              label="Nueva contraseña"
              autoComplete="new-password"
              error={errors.newPassword}
              {...register('newPassword')}
            />

            <PasswordInput
              id="confirmPassword"
              label="Confirmar nueva contraseña"
              autoComplete="new-password"
              error={errors.confirmPassword}
              {...register('confirmPassword')}
            />

            <div>
              <Button
                type="submit"
                size="sm"
                disabled={!isDirty || !isValid || changeMutation.isPending}
              >
                {changeMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </FieldGroup>
        </Form>
      </CardContent>
    </Card>
  );
}
