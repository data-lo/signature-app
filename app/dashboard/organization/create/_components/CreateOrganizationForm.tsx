'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
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
    <Card className="max-w-xl w-full">
      <CardHeader>
        <CardTitle>Crear organización</CardTitle>
        <CardDescription>
          Crea un nuevo espacio de trabajo para tu organización. Podrás
          alternar entre tu cuenta personal y la de la organización desde el
          selector de cuentas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit((values) =>
            createOrganizationMutation.mutate(values),
          )}
        >
          <FieldGroup>
            <TextField
              id="name"
              label="Nombre de visualización"
              placeholder="Acme"
              error={errors.name}
              {...register('name')}
            />

            <TextField
              id="organizationName"
              label="Razón social"
              placeholder="Acme Corp S.A. de C.V."
              error={errors.organizationName}
              {...register('organizationName')}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={!isValid || createOrganizationMutation.isPending}
            >
              {createOrganizationMutation.isPending
                ? 'Creando organización...'
                : 'Crear organización'}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
