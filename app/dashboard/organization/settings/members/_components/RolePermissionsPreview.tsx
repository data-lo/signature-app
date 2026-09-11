'use client';

import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { RolePermission } from '@/lib/api/roles';

interface RolePermissionsPreviewProps {
  roleName?: string;
  permissions: RolePermission[];
  loading?: boolean;
  /** Mensaje cuando todavía no hay un rol elegido; sin él, el bloque no se dibuja. */
  emptyHint?: string;
}

/**
 * Lista los permisos que otorga un rol, en lenguaje de negocio.
 *
 * Es la pieza que la historia pide mostrar "antes de confirmar la asignación": el administrador
 * elige un rol y ve exactamente qué va a poder hacer esa persona, sin tener que deducirlo del
 * nombre del rol.
 *
 * Sólo se listan los permisos del catálogo estático. La rejilla CRUD heredada del seed anterior
 * (`ORGANIZATION.READ`, `USER.DELETE`...) sigue existiendo en la base y viaja en la respuesta,
 * pero no es una capacidad de negocio: mostrarla aquí llenaría la pantalla de ruido interno. Se
 * resume en una línea al pie para no ocultar que existe.
 */
export default function RolePermissionsPreview({
  roleName,
  permissions,
  loading,
  emptyHint = 'Selecciona un rol para ver los permisos que otorga.',
}: RolePermissionsPreviewProps) {
  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Cargando permisos...</p>
    );
  }

  if (!roleName) {
    return <p className="text-sm text-muted-foreground">{emptyHint}</p>;
  }

  const catalogPermissions = permissions.filter(
    (permission) => permission.isStaticCatalog,
  );
  const internalPermissionCount =
    permissions.length - catalogPermissions.length;

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Permisos de</span>
        <Badge variant="secondary">{roleName}</Badge>
      </div>

      {catalogPermissions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Este rol no otorga todavía ninguno de los permisos del catálogo.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {catalogPermissions.map((permission) => (
            <li
              key={permission.id}
              className="flex items-start gap-2 text-sm text-muted-foreground"
            >
              <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              <span>{permission.description}</span>
            </li>
          ))}
        </ul>
      )}

      {internalPermissionCount > 0 && (
        <p className="text-xs text-muted-foreground">
          Además incluye {internalPermissionCount}{' '}
          {internalPermissionCount === 1
            ? 'permiso interno de administración'
            : 'permisos internos de administración'}
          .
        </p>
      )}
    </div>
  );
}
