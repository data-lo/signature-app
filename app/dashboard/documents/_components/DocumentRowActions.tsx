'use client';

import {
  FileDown,
  MoreVertical,
  Share2,
  Signature,
  SquareArrowOutUpRight,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DocumentRowActionsProps {
  /**
   * Lleva al flujo de firma. Ausente cuando el documento no es firmable por este usuario en esta
   * sección: quien decide eso es la tabla, acá sólo se dibuja lo que llega.
   */
  onSign?: () => void;
  /** true mientras se resuelve la URL de descarga de ESTE documento (no de otro de la lista). */
  isDownloading?: boolean;
  onDownload: () => void;
  /** Navegación al detalle; ausente solo si la vista contenedora no ofrece esa ruta. */
  onViewDetail?: () => void;
  /** Abre el modal con las personas involucradas en el documento, agrupadas por rol. */
  onViewParticipants: () => void;
  onShare: () => void;
}

/**
 * Menú de acciones por fila, idéntico en las tres secciones del módulo (Por firmar, Enviados para
 * firma, Completados): las acciones dejaron de ser botones sueltos por sección para concentrarse
 * aquí, con ícono y texto.
 *
 * "Firmar" fue la última en mudarse: era un botón de texto propio al lado del menú, el único
 * resto del reparto anterior. Va primero en la lista porque en "Por firmar" es la acción que el
 * usuario viene a hacer, y sólo aparece en los documentos que puede firmar.
 *
 * La previsualización en diálogo que vivía aquí se retiró: "Ver detalle" lleva a
 * `/dashboard/documents/:id`, que ya renderiza el PDF, así que era un segundo camino al mismo
 * visor.
 */
export default function DocumentRowActions({
  onSign,
  isDownloading = false,
  onDownload,
  onViewDetail,
  onViewParticipants,
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
        {onSign && (
          <DropdownMenuItem onClick={onSign}>
            <Signature className="size-4" />
            Firmar
          </DropdownMenuItem>
        )}
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
        {/* Junto a "Ver detalle" porque las dos son consultas sobre el documento, no acciones
          que lo modifiquen o lo saquen de la plataforma. */}
        <DropdownMenuItem onClick={onViewParticipants}>
          <Users className="size-4" />
          Ver participantes
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onShare}>
          <Share2 className="size-4" />
          Compartir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
