'use client';

import { KeyRound, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type {
  OrganizationMember,
  OrganizationMemberStatus,
} from '@/lib/api/organization-members';
import type { RolePermission } from '@/lib/api/roles';

interface MembersTableProps {
  members: OrganizationMember[];
  canManage: boolean;
  onEditRole?: (member: OrganizationMember) => void;
  onConfigurePermissions?: (member: OrganizationMember) => void;
  onRemove?: (member: OrganizationMember) => void;
}

const STATUS_LABELS: Record<
  OrganizationMemberStatus,
  { label: string; variant: 'success' | 'warning' | 'secondary' | 'outline' }
> = {
  active: { label: 'Activo', variant: 'success' },
  pending_invite: { label: 'Invitación pendiente', variant: 'warning' },
  suspended: { label: 'Suspendido', variant: 'warning' },
  removed: { label: 'Dado de baja', variant: 'secondary' },
};

function formatDate(isoDate: string | null): string {
  if (!isoDate) return '—';
  const date = new Date(isoDate);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

/**
 * Los permisos de negocio de un miembro. La rejilla CRUD interna que arrastra el rol ADMIN se
 * omite: en una tabla, media docena de filas técnicas por miembro tapan justo lo que se viene a
 * consultar.
 */
function catalogPermissionsOf(member: OrganizationMember): RolePermission[] {
  return member.permissions.filter((permission) => permission.isStaticCatalog);
}

export default function MembersTable({
  members,
  canManage,
  onEditRole,
  onConfigurePermissions,
  onRemove,
}: MembersTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Correo</TableHead>
          <TableHead>RFC</TableHead>
          <TableHead>Rol</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Permisos</TableHead>
          <TableHead>Fecha de ingreso</TableHead>
          {canManage && <TableHead />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => {
          const status = STATUS_LABELS[member.status] ?? {
            label: member.status,
            variant: 'outline' as const,
          };
          const permissions = catalogPermissionsOf(member);

          return (
            <TableRow key={member.accountId}>
              <TableCell>{member.email}</TableCell>
              <TableCell>{member.rfc ?? '—'}</TableCell>
              <TableCell>{member.role?.name ?? '—'}</TableCell>
              <TableCell>
                <Badge variant={status.variant}>{status.label}</Badge>
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
                        Permisos por el rol {member.role?.name ?? '—'}
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
              <TableCell>{formatDate(member.joinedAt)}</TableCell>
              {canManage && (
                <TableCell>
                  <DropdownMenu>
                    {/*
                      El disparador lleva nombre accesible: con la columna de permisos, cada fila
                      tiene ahora más de un botón, y "el primer botón de la fila" dejó de
                      identificar a este de forma fiable — ni para un lector de pantalla ni para
                      una prueba.
                    */}
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Acciones de ${member.email}`}
                        />
                      }
                    >
                      <MoreVertical className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEditRole?.(member)}>
                        <Pencil className="size-4" />
                        Editar Rol
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onConfigurePermissions?.(member)}
                      >
                        <KeyRound className="size-4" />
                        Etiquetas del catálogo
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => onRemove?.(member)}
                        disabled={!member.isActive}
                      >
                        <Trash2 className="size-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
