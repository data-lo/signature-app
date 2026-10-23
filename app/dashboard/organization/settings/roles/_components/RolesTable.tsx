'use client';

import { Pencil } from 'lucide-react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@/components/ui/table';
import { DataTableCard } from '@/components/data-table/data-table-card';
import {
  DataTableActionsHead,
  DataTableHeader,
} from '@/components/data-table/data-table-header';
import {
  DataTableLoadingRows,
  DataTableStateRow,
  resolveDataTableBodyState,
} from '@/components/data-table/data-table-body-state';
import { DataTableDate } from '@/components/data-table/data-table-date';
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions';
import { StatusIndicator } from '@/components/data-table/status-indicator';
import type { OrganizationRole } from '@/lib/api/organization-roles';
import { formatRoleName } from '@/lib/format-role-name';
import { formatShortDate } from '@/lib/format-datetime';

interface RolesTableProps {
  roles: OrganizationRole[];
  canManage: boolean;
  onEdit: (role: OrganizationRole) => void;
  /** La consulta todavía no tiene datos: se dibuja el esqueleto dentro de la tarjeta. */
  isLoading?: boolean;
  /** Mensaje si la consulta falló; tiene prioridad sobre la lista y sobre el estado vacío. */
  errorMessage?: string;
}

/** Lo que dice la tabla cuando la consulta respondió sin roles. */
export const EMPTY_ROLES_MESSAGE = 'No hay roles para mostrar.';

/**
 * Clases de la columna secundaria: en pantallas angostas la fecha de creación deja su columna y
 * pasa debajo del nombre.
 */
export const ROLE_SECONDARY_COLUMN_CLASS = 'hidden md:table-cell';

/** Sólo los del catálogo estático — nada de la rejilla CRUD heredada del seed anterior. */
function catalogPermissionsOf(role: OrganizationRole) {
  return role.permissions.filter((permission) => permission.isStaticCatalog);
}

/**
 * Tabla de "Roles y permisos", con la estructura de la tabla de Documentos: tarjeta, encabezado
 * gris, esqueleto de carga y error dentro de la tarjeta, fechas con tooltip y menú por fila.
 *
 * Con `canManage` (`ROLE.MANAGE`) cada rol personalizado ofrece "Editar"; los de sistema no
 * tienen menú, porque no se editan. Sin `canManage` no hay columna de acciones.
 *
 * En pantallas angostas la fecha de creación pasa bajo el nombre; tipo, permisos y acciones se
 * quedan en su columna.
 *
 * @param props - Roles, permiso de gestión, apertura de la edición y estado de la consulta.
 * @returns La tabla dentro de su tarjeta y, si no hay roles personalizados, el aviso para crearlos.
 *
 * @example
 * ```tsx
 * <RolesTable roles={roles} canManage onEdit={setEditingRole} isLoading={isLoading} />
 * ```
 */
export default function RolesTable({
  roles,
  canManage,
  onEdit,
  isLoading = false,
  errorMessage,
}: RolesTableProps) {
  const columnCount = canManage ? 5 : 4;
  const bodyState = resolveDataTableBodyState({
    errorMessage,
    isLoading,
    rowCount: roles.length,
  });
  const visibleRoles = bodyState === 'rows' ? roles : [];
  const hasCustomRoles = roles.some((role) => !role.isSystemRole);

  return (
    <div className="flex flex-col gap-3">
      <DataTableCard data-slot="roles-table-card">
        <Table aria-busy={bodyState === 'loading' || undefined}>
          <DataTableHeader>
            <TableHead>Nombre</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Permisos</TableHead>
            <TableHead className={ROLE_SECONDARY_COLUMN_CLASS}>
              Fecha de creación
            </TableHead>
            {canManage && <DataTableActionsHead />}
          </DataTableHeader>
          <TableBody>
            {bodyState === 'error' && (
              <DataTableStateRow
                columnCount={columnCount}
                className="text-destructive"
              >
                <span role="alert">{errorMessage}</span>
              </DataTableStateRow>
            )}
            {bodyState === 'loading' && (
              <DataTableLoadingRows
                columnCount={columnCount}
                label="Cargando roles"
                rowSlot="roles-loading-row"
              />
            )}
            {bodyState === 'empty' && (
              <DataTableStateRow columnCount={columnCount}>
                {EMPTY_ROLES_MESSAGE}
              </DataTableStateRow>
            )}
            {visibleRoles.map((role) => {
              const permissions = catalogPermissionsOf(role);
              const roleName = formatRoleName(role.name);

              return (
                <TableRow key={role.id} className="hover:bg-muted">
                  <TableCell>
                    <div className="flex min-w-0 flex-col">
                      <span>{roleName}</span>
                      <span
                        data-slot="role-mobile-details"
                        className="text-xs text-muted-foreground md:hidden"
                      >
                        Creado: {formatShortDate(role.createdAt)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <StatusIndicator
                      tone={role.isSystemRole ? 'neutral' : 'success'}
                      label={
                        role.isSystemRole ? 'Predeterminado' : 'Personalizado'
                      }
                    />
                  </TableCell>
                  <TableCell>
                    {permissions.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <Popover>
                        <PopoverTrigger
                          render={<Button variant="ghost" size="sm" />}
                        >
                          {permissions.length}{' '}
                          {permissions.length === 1 ? 'permiso' : 'permisos'}
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-80">
                          <p className="mb-2 text-sm font-medium">
                            Permisos de {roleName}
                          </p>
                          <ul className="flex flex-col gap-1.5">
                            {permissions.map((permission) => (
                              <li
                                key={permission.id}
                                className="text-sm text-muted-foreground"
                              >
                                {permission.description}
                              </li>
                            ))}
                          </ul>
                        </PopoverContent>
                      </Popover>
                    )}
                  </TableCell>
                  <TableCell
                    className={`whitespace-nowrap ${ROLE_SECONDARY_COLUMN_CLASS}`}
                  >
                    <DataTableDate date={role.createdAt} />
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {!role.isSystemRole && (
                          <DataTableRowActions
                            label={`Acciones de ${roleName}`}
                          >
                            <DropdownMenuItem onClick={() => onEdit(role)}>
                              <Pencil className="size-4" />
                              Editar
                            </DropdownMenuItem>
                          </DataTableRowActions>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableCard>

      {bodyState === 'rows' && !hasCustomRoles && (
        <p className="text-sm text-muted-foreground">
          Todavía no hay roles personalizados — créalo con el botón de arriba.
        </p>
      )}
    </div>
  );
}
