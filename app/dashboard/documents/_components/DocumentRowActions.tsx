'use client';

import { FileDown, MoreVertical, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DocumentRowActionsProps {
  /** true mientras se resuelve la URL de descarga de ESTE documento (no de otro de la lista). */
  isDownloading?: boolean;
  onDownload: () => void;
  onShare: () => void;
}

/**
 * Menú de acciones por fila, idéntico en las tres secciones del módulo (Por firmar, Enviados para
 * firma, Completados).
 *
 * Sólo quedan las acciones que hacen algo distinto de abrir el documento: descargar y compartir.
 * "Firmar" y "Ver detalle" se retiraron porque ambas llevaban a `/dashboard/documents/:id` y esa
 * navegación ahora la hace el clic sobre la fila entera; tenerlas también en el menú era ofrecer
 * tres caminos al mismo lugar.
 */
export default function DocumentRowActions({
  isDownloading = false,
  onDownload,
  onShare,
}: DocumentRowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Acciones del documento"
          />
        }
      >
        <MoreVertical className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem disabled={isDownloading} onClick={onDownload}>
          <FileDown className="size-4" />
          {isDownloading ? 'Descargando...' : 'Descargar'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onShare}>
          <Share2 className="size-4" />
          Compartir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
