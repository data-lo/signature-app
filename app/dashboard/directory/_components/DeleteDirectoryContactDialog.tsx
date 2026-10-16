'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { DirectoryContact } from '../_requests';

interface DeleteDirectoryContactDialogProps {
  /** Contacto a eliminar; `null` mantiene el diálogo cerrado. */
  contact: DirectoryContact | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (contactId: string) => void;
  confirming?: boolean;
}

/**
 * Confirmación previa a eliminar un contacto del Directorio.
 *
 * Se abre con el contacto elegido en la tabla y sólo llama a `onConfirm` tras el clic explícito
 * en "Eliminar"; cerrar o cancelar no toca nada.
 *
 * @param props - Contacto, cierre, confirmación y estado de la mutación.
 * @returns El diálogo de confirmación.
 *
 * @example
 * ```tsx
 * <DeleteDirectoryContactDialog
 *   contact={deletingContact}
 *   onOpenChange={(open) => !open && setDeletingContact(null)}
 *   onConfirm={(contactId) => deleteContact.mutate(contactId)}
 *   confirming={deleteContact.isPending}
 * />
 * ```
 */
export default function DeleteDirectoryContactDialog({
  contact,
  onOpenChange,
  onConfirm,
  confirming = false,
}: DeleteDirectoryContactDialogProps) {
  return (
    <Dialog open={contact !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Eliminar este contacto?</DialogTitle>
          <DialogDescription>
            {contact?.firstName} {contact?.lastName} ({contact?.email}) dejará
            de aparecer en tu directorio. Podrás volver a agregarlo más
            adelante.
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
            onClick={() => contact && onConfirm(contact.id)}
            disabled={confirming}
          >
            {confirming ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
