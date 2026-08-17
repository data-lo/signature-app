'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const PdfPreview = dynamic(() => import('../../_components/PdfPreview'), {
  ssr: false,
});

interface DocumentPreviewPanelProps {
  /** URL prefirmada del archivo; null mientras no se haya resuelto. */
  fileUrl: string | null;
  isLoading: boolean;
  isError: boolean;
  isRetrying: boolean;
  onRetry: () => void;
  /** Cubre el visor cuando la firma simple no está configurada (se llega por ruta directa). */
  isBlocked: boolean;
}

/** Columna derecha: el PDF, con sus tres estados (cargando, error con reintento, y el visor). */
export default function DocumentPreviewPanel({
  fileUrl,
  isLoading,
  isError,
  isRetrying,
  onRetry,
  isBlocked,
}: DocumentPreviewPanelProps) {
  return (
    <div className="relative h-[75vh]">
      <Card className="h-full overflow-hidden p-0">
        <CardContent className="h-full p-0">
          {isLoading ? (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Cargando documento...
            </div>
          ) : isError || !fileUrl ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-sm text-destructive">
                No se pudo cargar el archivo del documento.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isRetrying}
                onClick={onRetry}
              >
                {isRetrying ? 'Reintentando...' : 'Reintentar'}
              </Button>
            </div>
          ) : (
            <PdfPreview file={fileUrl} />
          )}
        </CardContent>
      </Card>

      {isBlocked && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/70 backdrop-blur-sm">
          <p className="max-w-xs rounded-lg bg-popover px-4 py-3 text-center text-sm font-medium text-popover-foreground shadow-sm ring-1 ring-foreground/10">
            Tu firma no ha sido configurada. Por favor confígurala para
            continuar.
          </p>
        </div>
      )}
    </div>
  );
}
