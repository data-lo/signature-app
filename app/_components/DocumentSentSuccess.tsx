'use client';

import { FileText, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DocumentSentSuccessProps {
  onGoToDocuments: () => void;
}

export default function DocumentSentSuccess({ onGoToDocuments }: DocumentSentSuccessProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
      <div className="flex size-28 items-center justify-center rounded-[40%] bg-amber-100">
        <div className="relative">
          <FileText className="size-12 text-blue-500" />
          <Send className="absolute -bottom-2 -right-2 size-6 text-emerald-500" />
        </div>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground">¡Has enviado el documento exitosamente!</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Los firmantes recibirán por correo una invitación para firmar. Puedes ver quién ya ha firmado desde
          el listado de documentos en la sección &quot;Mis documentos&quot;.
        </p>
      </div>
      <Button variant="brand" onClick={onGoToDocuments}>
        IR A MIS DOCUMENTOS
      </Button>
    </div>
  );
}
