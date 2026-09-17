'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { RolePermission } from '@/lib/api/organization-roles';

interface PermissionCheckboxListProps {
  /**
   * Catálogo estático a ofrecer, con su descripción real. Se recibe de afuera —normalmente los
   * permisos del rol ADMIN, que ya trae los siete— en vez de duplicar aquí las siete
   * descripciones que ya vive del lado del servidor.
   */
  availablePermissions: RolePermission[];
  selectedKeys: string[];
  onChange: (keys: string[]) => void;
  disabled?: boolean;
}

/**
 * Selector múltiple de los permisos del catálogo estático para un rol personalizado. Distinto de
 * `RolePermissionsPreview` (de solo lectura, para previsualizar un rol ya fijo antes de
 * asignarlo): aquí se eligen los permisos que el rol va a otorgar.
 *
 * Cada opción se rotula SÓLO con la descripción de negocio del permiso. La clave técnica
 * (`DOCUMENT.READ_OWN`, `MEMBER.INVITE`...) es un identificador interno del catálogo: sigue
 * siendo lo que se envía al backend y lo que liga el checkbox con su etiqueta, pero no se
 * muestra, para que quien crea un rol lea capacidades y no nomenclatura del sistema.
 */
export default function PermissionCheckboxList({
  availablePermissions,
  selectedKeys,
  onChange,
  disabled,
}: PermissionCheckboxListProps) {
  const staticPermissions = availablePermissions.filter(
    (permission) => permission.isStaticCatalog,
  );

  function toggle(key: string, checked: boolean) {
    onChange(
      checked
        ? [...selectedKeys, key]
        : selectedKeys.filter((selected) => selected !== key),
    );
  }

  if (staticPermissions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No se pudo cargar el catálogo de permisos.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {staticPermissions.map((permission) => (
        <div key={permission.key} className="group/field flex items-start gap-2">
          <Checkbox
            id={`permission-${permission.key}`}
            checked={selectedKeys.includes(permission.key)}
            onCheckedChange={(checked) => toggle(permission.key, checked === true)}
            disabled={disabled}
          />
          <Label
            htmlFor={`permission-${permission.key}`}
            className="font-normal leading-snug"
          >
            {permission.description}
          </Label>
        </div>
      ))}
    </div>
  );
}
