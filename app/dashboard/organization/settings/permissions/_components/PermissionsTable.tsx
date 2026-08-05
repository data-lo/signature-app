'use client';

import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { OrganizationPermission } from '@/lib/api/organization-permissions';

interface PermissionsTableProps {
  permissions: OrganizationPermission[];
  canManage: boolean;
  onEdit?: (permission: OrganizationPermission) => void;
  onDelete?: (permission: OrganizationPermission) => void;
}

export default function PermissionsTable({
  permissions,
  canManage,
  onEdit,
  onDelete,
}: PermissionsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Estatus</TableHead>
          {canManage && <TableHead />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {permissions.map((permission) => (
          <TableRow key={permission.id}>
            <TableCell>{permission.name}</TableCell>
            <TableCell>
              <div className="flex items-center gap-1.5">
                <span
                  className={`size-1.5 shrink-0 rounded-full ${
                    permission.isActive ? 'bg-emerald-500' : 'bg-gray-400'
                  }`}
                />
                <span>{permission.isActive ? 'Activo' : 'Inactivo'}</span>
              </div>
            </TableCell>
            {canManage && (
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button variant="ghost" size="icon-sm" />}
                  >
                    <MoreVertical className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit?.(permission)}>
                      <Pencil className="size-4" />
                      Modificar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => onDelete?.(permission)}
                    >
                      <Trash2 className="size-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
