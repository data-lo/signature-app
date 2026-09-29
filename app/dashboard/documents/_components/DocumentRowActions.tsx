'use client';

import {
  Archive,
  ArchiveRestore,
  FileDown,
  MoreVertical,
  Share2,
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
  /** true mientras se resuelve la URL de descarga de ESTE documento (no de otro de la lista). */
  isDownloading?: boolean;
  onDownload: () => void;
  /** Abre el modal con las personas involucradas en el documento, agrupadas por rol. */
  onViewParticipants: () => void;
  onShare: () => void;
  /**
   * Archiva el documento para el usuario en sesión. Ausente cuando la acción no corresponde —otra
   * sección, o un documento que todavía no está firmado por todos—: entonces el menú ni la
   * menciona, en vez de mostrarla deshabilitada. Una opción apagada invita a preguntarse qué
   * falta para encenderla, y aquí la respuesta sería "estar en otra pantalla".
   */
  onArchive?: () => void;
  /** true mientras se archiva ESTE documento (no otro de la lista). */
  isArchiving?: boolean;
  /**
   * Devuelve el documento archivado al listado del usuario. Sólo llega en la vista "Archivados",
   * que es donde "Archivar" no aparece: las dos acciones nunca se ofrecen juntas.
   */
  onRestore?: () => void;
  /** true mientras se recupera ESTE documento (no otro de la lista). */
  isRestoring?: boolean;
}

/**
 * Menú de acciones por fila, idéntico en las tres secciones del módulo (Por firmar, Enviados para
 * firma, Completados).
 *
 * Sólo quedan las acciones que hacen algo distinto de abrir el documento: descargar, consultar
 * participantes, compartir y —en Completados— archivar. "Firmar" y "Ver detalle" se retiraron
 * porque ambas llevaban a `/dashboard/documents/:id` y esa navegación ahora la hace el clic sobre
 * la fila entera; tenerlas también en el menú era ofrecer tres caminos al mismo lugar.
 */
export default function DocumentRowActions({
  isDownloading = false,
  onDownload,
  onViewParticipants,
  onShare,
  onArchive,
  isArchiving = false,
  onRestore,
  isRestoring = false,
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
        {/* Consultar quién participa es lo único que queda del grupo "mirar el documento sin
          salir de la lista": el resto de ese grupo se fue con la navegación por fila. */}
        <DropdownMenuItem onClick={onViewParticipants}>
          <Users className="size-4" />
          Ver participantes
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onShare}>
          <Share2 className="size-4" />
          Compartir
        </DropdownMenuItem>
        {/* Van al final y separadas del resto por su efecto: las de arriba consultan o copian
          el documento, éstas lo mueven entre el listado y los archivados. Archivar se deshace
          con "Recuperar", desde el filtro "Archivados". */}
        {onArchive && (
          <DropdownMenuItem disabled={isArchiving} onClick={onArchive}>
            <Archive className="size-4" />
            {isArchiving ? 'Archivando...' : 'Archivar'}
          </DropdownMenuItem>
        )}
        {onRestore && (
          <DropdownMenuItem disabled={isRestoring} onClick={onRestore}>
            <ArchiveRestore className="size-4" />
            {isRestoring ? 'Recuperando...' : 'Recuperar'}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
