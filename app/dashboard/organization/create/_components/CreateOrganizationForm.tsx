'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Info, Loader2, Plus } from 'lucide-react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { FieldGroup } from '@/components/ui/field';
import { TextField } from '@/components/form/text-field';
import {
  createOrganizationSchema,
  type CreateOrganizationFormValues,
} from '../_schemas';
import { useCreateOrganization } from '../_hooks/useCreateOrganization';
import { Form } from '@/components/form/form';

/**
 * Formulario de alta de una organización.
 *
 * **No depende del plan de la cuenta activa.** Crear una organización está disponible para
 * cualquier usuario: la organización nace sin plan y, al crearla, se manda al usuario a Planes para
 * contratar el suyo (ver `useCreateOrganization`). El botón sólo espera a que los datos sean
 * válidos y a que termine la petición.
 *
 * El título de la pantalla vive en la página; aquí la tarjeta agrupa los campos bajo "Datos de la
 * organización", con ayuda contextual y el rótulo "Obligatorio" en cada uno, y deja el aviso de
 * las dos cuentas en el pie.
 *
 * @returns La tarjeta con el formulario de alta.
 * @throws Nunca lanza: los errores de la petición los notifica `useCreateOrganization`.
 *
 * @example
 * ```tsx
 * <CreateOrganizationForm />
 * ```
 */
export default function CreateOrganizationForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<CreateOrganizationFormValues>({
    resolver: zodResolver(createOrganizationSchema),
    mode: 'onChange',
  });

  const createOrganizationMutation = useCreateOrganization();

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Datos de la organización</CardTitle>
        <CardDescription>
          Usaremos esta información para identificar la organización y su
          cuenta.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form
          onSubmit={handleSubmit((values) =>
            createOrganizationMutation.mutate(values),
          )}
        >
          <FieldGroup>
            <TextField
              id="name"
              label="Nombre de visualización"
              placeholder="Ej. Acme"
              description="Así aparecerá en el selector de cuentas."
              required
              error={errors.name}
              {...register('name')}
            />

            <TextField
              id="organizationName"
              label="Razón social"
              placeholder="Ej. Acme Corp S.A. de C.V."
              description="Usa el nombre legal de la organización."
              required
              error={errors.organizationName}
              {...register('organizationName')}
            />

            <div className="flex sm:justify-end">
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={!isValid || createOrganizationMutation.isPending}
              >
                {createOrganizationMutation.isPending ? (
                  <Loader2 className="animate-spin" aria-hidden />
                ) : (
                  <Plus aria-hidden />
                )}
                {createOrganizationMutation.isPending
                  ? 'Creando organización...'
                  : 'Crear organización'}
              </Button>
            </div>
          </FieldGroup>
        </Form>
      </CardContent>
      {/**
       * El aviso de las dos cuentas va al pie y no en la descripción: no es parte de lo que hay
       * que llenar, sino de lo que pasa después del alta.
       */}
      <CardFooter className="items-start gap-2 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <p>
          Después podrás alternar entre tu cuenta personal y la organización
          desde el selector de cuentas.
        </p>
      </CardFooter>
    </Card>
  );
}
