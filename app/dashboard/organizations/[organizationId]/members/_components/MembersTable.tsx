'use client';

import { Pencil, Trash2 } from 'lucide-react';
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
import { DataTableStateRow } from '@/components/data-table/data-table-body-state';
import { DataTableDate } from '@/components/data-table/data-table-date';
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions';
import {
  StatusIndicator,
  type StatusTone,
} from '@/components/data-table/status-indicator';
import type {
  OrganizationMember,
  OrganizationMemberStatus,
} from '@/lib/api/organization-members';
import type { RolePermission } from '@/lib/api/roles';
import { formatRoleName } from '@/lib/format-role-name';
import { formatShortDate } from '@/lib/format-datetime';
import {
  isOwnerMember,
  OWNER_CANNOT_BE_DEACTIVATED_MESSAGE,
  OWNER_ROLE_CANNOT_CHANGE_MESSAGE,
} from '@/lib/assignable-member-roles';

interface MembersTableProps {
  members: OrganizationMember[];
  canManage: boolean;
  onEditRole?: (member: OrganizationMember) => void;
  onRemove?: (member: OrganizationMember) => void;
}

/** Lo que dice la tabla cuando no hay miembros que mostrar. */
export const EMPTY_MEMBERS_MESSAGE = 'No hay miembros para mostrar.';

/**
 * Clases de las columnas secundarias: en pantallas angostas se ocultan y su dato pasa debajo del
 * correo (ver `MemberIdentityCell`), igual que Documentos apila el RFC bajo "Creado por".
 */
export const MEMBER_SECONDARY_COLUMN_CLASS = 'hidden md:table-cell';

const STATUS_LABELS: Record<
  OrganizationMemberStatus,
  { label: string; tone: StatusTone }
> = {
  active: { label: 'Activo', tone: 'success' },
  pending_invite: { label: 'Invitación pendiente', tone: 'warning' },
  suspended: { label: 'Suspendido', tone: 'warning' },
  removed: { label: 'Dado de baja', tone: 'neutral' },
};

/**
 * Los permisos de negocio de un miembro. La rejilla CRUD interna que arrastra el rol ADMIN se
 * omite: en una tabla, media docena de filas técnicas por miembro tapan justo lo que se viene a
 * consultar.
 */
function catalogPermissionsOf(member: OrganizationMember): RolePermission[] {
  return member.permissions.filter((permission) => permission.isStaticCatalog);
}

/** Texto de una opción del menú, con una línea que explica por qué está deshabilitada. */
function MenuItemLabel({
  label,
  hint,
}: {
  label: string;
  hint: string | null;
}) {
  if (!hint) return <>{label}</>;

  return (
    <span className="flex flex-col">
      <span>{label}</span>
      <span className="text-xs text-muted-foreground">{hint}</span>
    </span>
  );
}

/**
 * Celda principal de la fila: el correo del miembro y, sólo en pantallas angostas, el RFC y la
 * fecha de ingreso, que ahí no tienen columna propia.
 *
 * El dato apilado lleva prefijo ("RFC: ", "Ingreso: ") porque, fuera de su columna, no hay
 * encabezado que diga qué es.
 *
 * @param props.member - Miembro de la fila.
 * @returns El correo con los datos secundarios debajo en móvil.
 *
 * @example
 * ```tsx
 * <MemberIdentityCell member={member} />
 * ```
 */
function MemberIdentityCell({ member }: { member: OrganizationMember }) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="truncate">{member.email}</span>
      <span
        data-slot="member-mobile-details"
        className="flex flex-col text-xs text-muted-foreground md:hidden"
      >
        {member.rfc && <span>RFC: {member.rfc}</span>}
        {member.joinedAt && (
          <span>Ingreso: {formatShortDate(member.joinedAt)}</span>
        )}
      </span>
    </div>
  );
}

/**
 * Tabla de "Administrar miembros", con la estructura de la tabla de Documentos: tarjeta,
 * encabezado gris, estados con punto de color, fechas con tooltip y menú de acciones por fila.
 *
 * Las acciones sólo aparecen con `canManage` (lo decide `MembersManager` con `MEMBER.INVITE`).
 * Sobre el propietario, "Editar Rol" y "Desactivar" se ven deshabilitadas y explican por qué, en
 * vez de desaparecer: un menú que en una fila tiene opciones y en otra no deja a quien administra
 * preguntándose si es un error.
 *
 * En pantallas angostas RFC y fecha de ingreso dejan su columna y pasan bajo el correo; rol,
 * estado, permisos y acciones se quedan, así que el menú sigue a mano. Si aun así no cabe, la
 * tabla se desplaza en horizontal como la de Documentos.
 *
 * @param props.members - Miembros a mostrar.
 * @param props.canManage - Si quien ve la tabla puede administrar miembros.
 * @param props.onEditRole - Abre el cambio de rol del miembro.
 * @param props.onRemove - Abre la confirmación de baja del miembro.
 * @returns La tabla dentro de su tarjeta.
 *
 * @example
 * ```tsx
 * <MembersTable members={members} canManage onEditRole={openEdit} onRemove={openRemove} />
 * ```
 */
export default function MembersTable({
  members,
  canManage,
  onEditRole,
  onRemove,
}: MembersTableProps) {
  const columnCount = canManage ? 7 : 6;

  return (
    <DataTableCard data-slot="members-table-card">
      <Table>
        <DataTableHeader>
          <TableHead>Correo</TableHead>
          <TableHead className={MEMBER_SECONDARY_COLUMN_CLASS}>RFC</TableHead>
          <TableHead>Rol</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Permisos</TableHead>
          <TableHead className={MEMBER_SECONDARY_COLUMN_CLASS}>
            Fecha de ingreso
          </TableHead>
          {canManage && <DataTableActionsHead />}
        </DataTableHeader>
        <TableBody>
          {members.length === 0 && (
            <DataTableStateRow columnCount={columnCount}>
              {EMPTY_MEMBERS_MESSAGE}
            </DataTableStateRow>
          )}
          {members.map((member) => {
            const status = STATUS_LABELS[member.status] ?? {
              label: member.status,
              tone: 'neutral' as const,
            };
            const permissions = catalogPermissionsOf(member);
            const isOwner = isOwnerMember(member);

            return (
              <TableRow key={member.accountId} className="hover:bg-muted">
                <TableCell className="max-w-64">
                  <MemberIdentityCell member={member} />
                </TableCell>
                <TableCell className={MEMBER_SECONDARY_COLUMN_CLASS}>
                  {member.rfc ?? (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatRoleName(member.role?.name)}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <StatusIndicator tone={status.tone} label={status.label} />
                </TableCell>
                <TableCell>
                  {permissions.length === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    /*
                      Un contador con el detalle a un clic: la lista completa por fila haría la
                      tabla ilegible, y esconderla del todo dejaría sin respuesta la pregunta que
                      trae aquí al administrador ("¿qué puede hacer esta persona?").
                    */
                    <Popover>
                      <PopoverTrigger
                        render={<Button variant="ghost" size="sm" />}
                      >
                        {permissions.length}{' '}
                        {permissions.length === 1 ? 'permiso' : 'permisos'}
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-80">
                        <p className="mb-2 text-sm font-medium">
                          Permisos por el rol{' '}
                          {formatRoleName(member.role?.name)}
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
                  className={`whitespace-nowrap ${MEMBER_SECONDARY_COLUMN_CLASS}`}
                >
                  <DataTableDate date={member.joinedAt} />
                </TableCell>
                {canManage && (
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <DataTableRowActions
                        label={`Acciones de ${member.email}`}
                        contentClassName="w-auto min-w-44"
                      >
                        <DropdownMenuItem
                          onClick={() => onEditRole?.(member)}
                          disabled={isOwner}
                        >
                          <Pencil className="size-4" />
                          <MenuItemLabel
                            label="Editar Rol"
                            hint={
                              isOwner ? OWNER_ROLE_CANNOT_CHANGE_MESSAGE : null
                            }
                          />
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => onRemove?.(member)}
                          disabled={!member.isActive || isOwner}
                        >
                          <Trash2 className="size-4" />
                          <MenuItemLabel
                            label="Desactivar"
                            hint={
                              isOwner
                                ? OWNER_CANNOT_BE_DEACTIVATED_MESSAGE
                                : null
                            }
                          />
                        </DropdownMenuItem>
                      </DataTableRowActions>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </DataTableCard>
  );
}
