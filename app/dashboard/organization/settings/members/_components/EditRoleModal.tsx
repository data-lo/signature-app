'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSystemRoles } from '@/lib/hooks/useSystemRoles';
import type { OrganizationMember } from '@/lib/api/organization-members';

interface EditRoleModalProps {
  member: OrganizationMember | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (accountId: string, roleId: string) => void;
  confirming?: boolean;
}

export default function EditRoleModal({
  member,
  onOpenChange,
  onConfirm,
  confirming,
}: EditRoleModalProps) {
  const open = member !== null;
  const { data: roles, isLoading: rolesLoading } = useSystemRoles(open);
  const [roleId, setRoleId] = useState<string | null>(null);

  useEffect(() => {
    setRoleId(member?.role?.id ?? null);
  }, [member]);

  const roleOptions = (roles ?? []).map((role) => ({
    value: role.id,
    label: role.name,
  }));

  function handleConfirm() {
    if (!member || !roleId) return;
    onConfirm(member.accountId, roleId);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar rol</DialogTitle>
          <DialogDescription>
            Selecciona el nuevo rol para {member?.email} dentro de la
            organización.
          </DialogDescription>
        </DialogHeader>

        <Field>
          <FieldLabel htmlFor="edit-role-select">Rol</FieldLabel>
          {/*
            `items` hace que el trigger muestre el NOMBRE del rol y no su id: sin esta prop,
            `<Select.Value>` renderiza el valor crudo — acá, el UUID del rol.
          */}
          <Select
            items={roleOptions}
            value={roleId}
            onValueChange={(value) => setRoleId(value)}
          >
            <SelectTrigger id="edit-role-select" className="w-full">
              <SelectValue
                placeholder={rolesLoading ? 'Cargando roles...' : 'Selecciona un rol'}
              />
            </SelectTrigger>
            <SelectContent>
              {roles?.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={confirming}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!roleId || confirming}
          >
            {confirming ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
