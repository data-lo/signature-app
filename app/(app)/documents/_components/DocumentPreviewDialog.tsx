'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDocumentDetail } from '../[documentId]/_hooks/useDocumentDetail';

const PdfPreview = dynamic(() => import('./PdfPreview'), { ssr: false });

interface DocumentPreviewDialogProps {
  documentId: string | null;
  fileName?: string;
  onOpenChange: (open: boolean) => void;
}

export default function DocumentPreviewDialog({
  documentId,
  fileName,
  onOpenChange,
}: DocumentPreviewDialogProps) {
  const {
    data: document,
    isLoading,
    isError,
  } = useDocumentDetail(documentId ?? '', { enabled: !!documentId });

  return (
    <Dialog open={!!documentId} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{fileName ?? 'Documento firmado'}</DialogTitle>
        </DialogHeader>

        <div className="h-[75vh] overflow-hidden rounded-lg border border-border">
          {isLoading && (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Cargando documento...
            </div>
          )}
          {isError && (
            <div className="flex h-full items-center justify-center text-sm text-destructive">
              No se pudo cargar el documento.
            </div>
          )}
          {document && <PdfPreview file={document.secureUrl} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
