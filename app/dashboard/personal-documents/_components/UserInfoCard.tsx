'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup } from '@/components/ui/field';
import { TextField } from '@/components/form/text-field';
import type { CurrentUser } from '@/lib/api/auth';
import {
  updatePersonalInfoSchema,
  type UpdatePersonalInfoFormValues,
} from '../_schemas';
import { useUpdatePersonalInformation } from '../_hooks/useUpdatePersonalInformation';
import { Form } from '@/components/form/form';

interface UserInfoCardProps {
  user: CurrentUser;
}

export default function UserInfoCard({ user }: UserInfoCardProps) {
  const updateMutation = useUpdatePersonalInformation();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty },
  } = useForm<UpdatePersonalInfoFormValues>({
    resolver: zodResolver(updatePersonalInfoSchema),
    mode: 'onChange',
    values: {
      phoneNumber: user.phoneNumber ?? '',
      secondaryEmail: user.secondaryEmail ?? '',
    },
  });

  function onSubmit(values: UpdatePersonalInfoFormValues) {
    updateMutation.mutate(values);
  }

  return (
    <Card id="personal-info" className="w-full max-w-3xl scroll-mt-6">
      <CardHeader>
        <CardTitle>Mi información</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Nombre</dt>
          <dd className="font-medium">
            {user.firstName} {user.lastName}
          </dd>

          <dt className="text-muted-foreground">Correo</dt>
          <dd className="font-medium">{user.email}</dd>

          <dt className="text-muted-foreground">CURP</dt>
          <dd className="font-medium">{user.nationalId}</dd>

          <dt className="text-muted-foreground">RFC</dt>
          <dd className="font-medium">{user.rfc ?? '—'}</dd>

        </dl>

        <Form onSubmit={handleSubmit(onSubmit)} className="mt-4">
          <FieldGroup>
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                id="phoneNumber"
                label="Teléfono"
                type="tel"
                placeholder="5512345678"
                error={errors.phoneNumber}
                {...register('phoneNumber')}
              />

              <TextField
                id="secondaryEmail"
                label="Correo secundario"
                type="email"
                placeholder="correo@dominio.com"
                error={errors.secondaryEmail}
                {...register('secondaryEmail')}
              />
            </div>

            <div>
              <Button
                type="submit"
                size="sm"
                disabled={!isDirty || !isValid || updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </FieldGroup>
        </Form>
      </CardContent>
    </Card>
  );
}
