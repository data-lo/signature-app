'use client';

import { MoreVertical, Pencil } from 'lucide-react';
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
import type { OrganizationRole } from '@/lib/api/organization-roles';

interface RolesTableProps {
  roles: OrganizationRole[];
  canManage: boolean;
  onEdit: (role: OrganizationRole) => void;
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

/** Sólo los siete del catálogo estático — nada de la rejilla CRUD heredada del seed anterior. */
function catalogPermissionsOf(role: OrganizationRole) {
  return role.permissions.filter((permission) => permission.isStaticCatalog);
}

export default function RolesTable({ roles, canManage, onEdit }: RolesTableProps) {
  const hasCustomRoles = roles.some((role) => !role.isSystemRole);

  return (
    <div className="flex flex-col gap-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Permisos</TableHead>
            <TableHead>Fecha de creación</TableHead>
            {canManage && <TableHead />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.map((role) => {
            const permissions = catalogPermissionsOf(role);

            return (
              <TableRow key={role.id}>
                <TableCell>{role.name}</TableCell>
                <TableCell>
                  <Badge variant={role.isSystemRole ? 'secondary' : 'outline'}>
                    {role.isSystemRole ? 'Predeterminado' : 'Personalizado'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {permissions.length === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <Popover>
                      <PopoverTrigger render={<Button variant="ghost" size="sm" />}>
                        {permissions.length}{' '}
                        {permissions.length === 1 ? 'permiso' : 'permisos'}
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-80">
                        <p className="mb-2 text-sm font-medium">
                          Permisos de {role.name}
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
                <TableCell>{formatDate(role.createdAt)}</TableCell>
                {canManage && (
                  <TableCell>
                    {!role.isSystemRole && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Acciones de ${role.name}`}
                            />
                          }
                        >
                          <MoreVertical className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(role)}>
                            <Pencil className="size-4" />
                            Editar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {!hasCustomRoles && (
        <p className="text-sm text-muted-foreground">
          Todavía no hay roles personalizados — créalo con el botón de arriba.
        </p>
      )}
    </div>
  );
}
