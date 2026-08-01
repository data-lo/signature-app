'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { OrganizationPermission } from '@/lib/api/organization-permissions';

interface DeletePermissionDialogProps {
  permission: OrganizationPermission | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (permissionId: string) => void;
  confirming?: boolean;
}

export default function DeletePermissionDialog({
  permission,
  onOpenChange,
  onConfirm,
  confirming,
}: DeletePermissionDialogProps) {
  return (
    <Dialog open={permission !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Eliminar este permiso?</DialogTitle>
          <DialogDescription>
            ¿Estás seguro de que deseas eliminar &quot;{permission?.name}&quot;
            del catálogo? También se quitará de cualquier miembro que lo
            tuviera asignado.
          </DialogDescription>
        </DialogHeader>
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
            variant="destructive"
            onClick={() => permission && onConfirm(permission.id)}
            disabled={confirming}
          >
            {confirming ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
