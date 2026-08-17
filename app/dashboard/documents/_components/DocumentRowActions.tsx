'use client';

import {
  FileDown,
  MoreVertical,
  Share2,
  SquareArrowOutUpRight,
} from 'lucide-react';
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
  /** Navegación al detalle; ausente solo si la vista contenedora no ofrece esa ruta. */
  onViewDetail?: () => void;
  onShare: () => void;
}

/**
 * Menú de acciones por fila, idéntico en las tres secciones del módulo (Por firmar, Enviados para
 * firma, Completados): las acciones dejaron de ser botones sueltos por sección para concentrarse
 * aquí, con ícono y texto.
 *
 * Son exactamente tres, también para documentos ya firmados. La previsualización en diálogo que
 * vivía aquí se retiró: "Ver detalle" lleva a `/dashboard/documents/:id`, que ya renderiza el PDF,
 * así que era un segundo camino al mismo visor.
 */
export default function DocumentRowActions({
  isDownloading = false,
  onDownload,
  onViewDetail,
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
        {onViewDetail && (
          <DropdownMenuItem onClick={onViewDetail}>
            <SquareArrowOutUpRight className="size-4" />
            Ver detalle
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onShare}>
          <Share2 className="size-4" />
          Compartir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
