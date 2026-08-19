'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SignatureRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Aviso de firma simple sin configurar. Se puede cerrar y no vuelve a abrirse: el acceso a la
 * configuración también vive en `DocumentSignaturePanel`, fuera del bloque inerte, para que la
 * pantalla nunca quede sin salida.
 */
export default function SignatureRequiredDialog({
  open,
  onOpenChange,
}: SignatureRequiredDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Firma no configurada</DialogTitle>
          <DialogDescription>
            Tu firma no ha sido configurada. Por favor confígurala para
            continuar.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            nativeButton={false}
            render={<Link href="/dashboard/personal-documents/identity" />}
          >
            Configurar firma
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
