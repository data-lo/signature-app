'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
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

interface UserInfoCardProps {
  user: CurrentUser;
}

export default function UserInfoCard({ user }: UserInfoCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const updateMutation = useUpdatePersonalInformation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<UpdatePersonalInfoFormValues>({
    resolver: zodResolver(updatePersonalInfoSchema),
    mode: 'onChange',
    values: {
      phoneNumber: user.phoneNumber ?? '',
      secondaryEmail: user.secondaryEmail ?? '',
    },
  });

  function handleCancel() {
    reset();
    setIsEditing(false);
  }

  function onSubmit(values: UpdatePersonalInfoFormValues) {
    updateMutation.mutate(values, { onSuccess: () => setIsEditing(false) });
  }

  return (
    <Card id="personal-info" className="max-w-xl w-full scroll-mt-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Mi información</CardTitle>
        {!isEditing && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="size-3.5" />
            Editar
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Nombre</dt>
          <dd className="font-medium">
            {user.firstName} {user.lastName}
          </dd>

          <dt className="text-muted-foreground">Correo</dt>
          <dd className="font-medium">{user.email}</dd>

          <dt className="text-muted-foreground">Puesto</dt>
          <dd className="font-medium">{user.position ?? '—'}</dd>

          <dt className="text-muted-foreground">CURP</dt>
          <dd className="font-medium">{user.nationalId}</dd>

          {!isEditing && (
            <>
              <dt className="text-muted-foreground">Teléfono</dt>
              <dd className="font-medium">{user.phoneNumber ?? '—'}</dd>

              <dt className="text-muted-foreground">Correo secundario</dt>
              <dd className="font-medium">{user.secondaryEmail ?? '—'}</dd>
            </>
          )}
        </dl>

        {isEditing && (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-4">
            <FieldGroup>
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

              <div className="flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={!isValid || updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Guardando...' : 'Guardar'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={updateMutation.isPending}
                >
                  Cancelar
                </Button>
              </div>
            </FieldGroup>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
