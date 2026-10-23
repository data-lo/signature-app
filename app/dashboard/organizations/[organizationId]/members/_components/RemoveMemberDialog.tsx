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
import type { OrganizationMember } from '@/lib/api/organization-members';

interface RemoveMemberDialogProps {
  member: OrganizationMember | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (accountId: string) => void;
  confirming?: boolean;
}

export default function RemoveMemberDialog({
  member,
  onOpenChange,
  onConfirm,
  confirming,
}: RemoveMemberDialogProps) {
  return (
    <Dialog open={member !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Desactivar a este miembro?</DialogTitle>
          <DialogDescription>
            ¿Estás seguro de que deseas desactivar a {member?.email} en la
            organización? Perderá el acceso inmediatamente.
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
            onClick={() => member && onConfirm(member.accountId)}
            disabled={confirming}
          >
            {confirming ? 'Desactivando...' : 'Desactivar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
