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
import { TextField } from '@/components/form/text-field';
import { Switch } from '@/components/ui/switch';
import type { OrganizationPermission } from '@/lib/api/organization-permissions';

interface EditPermissionModalProps {
  permission: OrganizationPermission | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (
    permissionId: string,
    changes: { name: string; isActive: boolean },
  ) => void;
  confirming?: boolean;
}

export default function EditPermissionModal({
  permission,
  onOpenChange,
  onConfirm,
  confirming,
}: EditPermissionModalProps) {
  const open = permission !== null;
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    setName(permission?.name ?? '');
    setIsActive(permission?.isActive ?? true);
  }, [permission]);

  function handleConfirm() {
    if (!permission || !name.trim()) return;
    onConfirm(permission.id, { name: name.trim(), isActive });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modificar permiso</DialogTitle>
          <DialogDescription>
            Actualiza el nombre o el estatus de este permiso.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <TextField
            id="edit-permission-name"
            label="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Field orientation="horizontal">
            <FieldLabel htmlFor="edit-permission-active">Activo</FieldLabel>
            <Switch
              id="edit-permission-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </Field>
        </div>

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
            disabled={!name.trim() || confirming}
          >
            {confirming ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
