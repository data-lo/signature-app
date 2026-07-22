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
import type { OrganizationMember } from '@/lib/api/organization-members';

interface MembersTableProps {
  members: OrganizationMember[];
  canManage: boolean;
  onEditRole?: (member: OrganizationMember) => void;
  onRemove?: (member: OrganizationMember) => void;
}

function formatDate(isoDate: string | null): string {
  if (!isoDate) return '—';
  const date = new Date(isoDate);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

export default function MembersTable({
  members,
  canManage,
  onEditRole,
  onRemove,
}: MembersTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Correo</TableHead>
          <TableHead>RFC</TableHead>
          <TableHead>Rol</TableHead>
          <TableHead>Fecha de ingreso</TableHead>
          {canManage && <TableHead />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <TableRow key={member.accountId}>
            <TableCell>{member.email}</TableCell>
            <TableCell>{member.rfc ?? '—'}</TableCell>
            <TableCell>{member.role?.name ?? '—'}</TableCell>
            <TableCell>{formatDate(member.joinedAt)}</TableCell>
            {canManage && (
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button variant="ghost" size="icon-sm" />}
                  >
                    <MoreVertical className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEditRole?.(member)}>
                      <Pencil className="size-4" />
                      Editar Rol
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => onRemove?.(member)}
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
