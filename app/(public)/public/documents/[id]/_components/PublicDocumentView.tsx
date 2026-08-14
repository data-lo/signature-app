'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DocumentStatus } from '@/lib/enums/document';
import { usePublicDocument } from '../_hooks/usePublicDocument';

// react-pdf necesita el DOM (`DOMMatrix`), así que se carga solo en cliente igual que los demás
// visores del proyecto. Con un `import` estático, pdfjs se evaluaba durante el SSR de esta página
// —que ocurre aunque el componente sea 'use client'— y reventaba con `ReferenceError: DOMMatrix is
// not defined` ANTES de renderizar nada: la ruta devolvía 500 para cualquier documento, incluso
// para los estatus que ni siquiera llegan a montar el visor. Importa porque esta es la página a la
// que apunta el QR impreso en la hoja de firmas de cada documento firmado.
const PublicPdfViewer = dynamic(() => import('./PublicPdfViewer'), {
  ssr: false,
});

const IN_PROGRESS_STATUSES: DocumentStatus[] = [
  DocumentStatus.Pending,
  DocumentStatus.Created,
  DocumentStatus.CancellationPending,
];

interface PublicDocumentViewProps {
  documentId: string;
}

function StatusCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Historia "Visualización pública de documentos firmados mediante MinIO": el backend
 * (GET /document/public/:id, sin auth) solo resuelve `secureUrl` cuando `status` es SIGNED — para
 * cualquier otro estatus la responde en null. La UI nunca decide por su cuenta si mostrar el
 * archivo; solo refleja el `status` que ya vino filtrado desde el backend.
 */
export default function PublicDocumentView({
  documentId,
}: PublicDocumentViewProps) {
  const { data, isLoading, isError } = usePublicDocument(documentId);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <StatusCard
        title="Documento no encontrado"
        description="El enlace no es válido o el documento ya no existe."
      />
    );
  }

  if (data.status === DocumentStatus.Signed && data.secureUrl) {
    return (
      <div className="flex h-screen flex-col">
        <header className="border-b border-border px-6 py-4">
          <h1 className="text-sm font-semibold text-foreground">
            {data.fileName}
          </h1>
        </header>
        <div className="min-h-0 flex-1">
          <PublicPdfViewer file={data.secureUrl} />
        </div>
      </div>
    );
  }

  if (IN_PROGRESS_STATUSES.includes(data.status)) {
    return (
      <StatusCard
        title="Documento en proceso"
        description="El documento se encuentra en proceso."
      />
    );
  }

  return (
    <StatusCard
      title="Documento no disponible"
      description="El documento no está disponible para su consulta."
    />
  );
}
