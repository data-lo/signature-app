'use client';

import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { buildPublicDocumentUrl } from '@/lib/document-public-url';

interface ShareDocumentDialogProps {
  /** Documento a compartir; `null` mantiene el diálogo cerrado. */
  documentId: string | null;
  fileName?: string;
  onOpenChange: (open: boolean) => void;
}

/**
 * Copia al portapapeles con respaldo para los navegadores/contextos donde `navigator.clipboard` no
 * existe (la Clipboard API solo está disponible en contextos seguros: en HTTP plano —como los
 * despliegues internos por IP— sería `undefined` y la acción "Compartir" no haría nada).
 */
async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}

/**
 * Acción "Compartir" de la tabla de documentos: genera el enlace público del documento
 * (`/public/documents/:id`, la única vista consultable sin sesión), lo muestra y permite copiarlo.
 * No hay llamada al backend: el enlace es determinista a partir del id, y el propio visor público
 * ya decide qué mostrar según el estatus del documento (`GET /document/public/:id`).
 */
export default function ShareDocumentDialog({
  documentId,
  fileName,
  onOpenChange,
}: ShareDocumentDialogProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = documentId ? buildPublicDocumentUrl(documentId) : '';

  // Al abrir otro documento (o reabrir el mismo) el botón vuelve a "Copiar enlace": si no, el
  // diálogo se abriría mostrando la confirmación de una copia anterior.
  useEffect(() => {
    setCopied(false);
  }, [documentId]);

  const handleCopy = async () => {
    if (await copyText(shareUrl)) {
      setCopied(true);
      toast.success('Enlace copiado');
      return;
    }

    toast.error('No se pudo copiar el enlace. Cópialo manualmente.');
  };

  return (
    <Dialog open={!!documentId} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Compartir documento</DialogTitle>
          <DialogDescription>
            Cualquiera con este enlace puede consultar la vista pública de
            {fileName ? ` “${fileName}”` : ' este documento'}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={shareUrl}
            aria-label="Enlace público del documento"
            onFocus={(event) => event.currentTarget.select()}
            className="font-mono text-xs"
          />
          <Button variant="brand" onClick={handleCopy} className="shrink-0">
            {copied ? (
              <>
                <Check className="size-4" />
                Enlace copiado
              </>
            ) : (
              <>
                <Copy className="size-4" />
                Copiar enlace
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
