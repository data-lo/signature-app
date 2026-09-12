'use client';

import { Users } from 'lucide-react';
import { useIsOrganizationAdmin } from '@/lib/hooks/useIsOrganizationAdmin';
import InviteMemberModal from './InviteMemberModal';
import AddMemberModal from './AddMemberModal';

interface MembersEmptyStateProps {
  organizationId: string;
}

/**
 * Lo que se ve cuando la organización todavía no tiene miembros.
 *
 * Reemplaza a la tabla por completo: no se dibujan encabezados ni columnas. Una tabla con sus
 * seis títulos y ningún renglón no dice "todavía no invitaste a nadie", dice "algo no cargó" —y
 * deja al administrador esperando en lugar de actuar.
 *
 * Los dos botones de alta viven aquí, y no en una cabecera común, para que no aparezcan
 * duplicados: cuando hay miembros los ofrece `MembersManager`, y cuando no los hay, este estado.
 * Es además el único momento en que el llamado a la acción es lo principal de la pantalla.
 *
 * El gate de administrador es el mismo que rige la tabla: quien sólo puede leer no ve acciones
 * que el backend va a rechazar.
 *
 * @param props - Organización activa, que necesita el alta directa.
 * @returns El estado vacío con sus dos acciones de alta.
 * @throws Nada.
 *
 * @example
 * ```tsx
 * {members.length === 0 && <MembersEmptyState organizationId={organizationId} />}
 * ```
 */
export default function MembersEmptyState({
  organizationId,
}: MembersEmptyStateProps) {
  const { isAdmin, isLoading } = useIsOrganizationAdmin();
  const canManage = isAdmin && !isLoading;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Miembros</h1>
        <p className="text-sm text-muted-foreground">
          Administra los miembros de tu organización, sus roles y su acceso.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border px-6 py-12 text-center">
        <Users className="size-10 text-muted-foreground" aria-hidden />

        <div className="flex max-w-md flex-col gap-1">
          <h2 className="font-heading text-xl font-medium text-foreground">
            Aún no has invitado miembros
          </h2>
          <p className="text-sm text-muted-foreground">
            Invita miembros a tu organización para colaborar y administrar sus
            permisos.
          </p>
        </div>

        {canManage && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <InviteMemberModal organizationId={organizationId} />
            <AddMemberModal organizationId={organizationId} />
          </div>
        )}
      </div>
    </div>
  );
}
