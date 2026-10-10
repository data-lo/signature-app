'use client';

import { useState } from 'react';
import {
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@/components/ui/table';
import { DataTableCard } from '@/components/data-table/data-table-card';
import {
  DataTableActionsHead,
  DataTableHeader,
} from '@/components/data-table/data-table-header';
import {
  DataTableLoadingRows,
  DataTableStateRow,
} from '@/components/data-table/data-table-body-state';
import { DataTableDate } from '@/components/data-table/data-table-date';
import {
  StatusDot,
  StatusIndicator,
  type StatusTone,
} from '@/components/data-table/status-indicator';
import DocumentRowActions from './DocumentRowActions';
import DocumentParticipantsDialog from './DocumentParticipantsDialog';
import ShareDocumentDialog from './ShareDocumentDialog';
import { useDownloadDocument } from '../_hooks/useDownloadDocument';
import { useArchiveCompletedDocument } from '../_hooks/useArchiveCompletedDocument';
import { useRestoreArchivedDocument } from '../_hooks/useRestoreArchivedDocument';
import DocumentFileName from './DocumentFileName';
import { usePermissions } from '@/lib/hooks/usePermissions';
import type { PermissionKey } from '@/lib/authorization/authorization.types';
import {
  DocumentParticipation,
  DocumentStatus,
  SignatureType,
} from '@/lib/enums/document';
import {
  DEFAULT_DOCUMENTS_PAGE_SIZE,
  DOCUMENTS_PAGE_SIZES,
  isDocumentsPageSize,
  lastDocumentsPage,
  type DocumentsPageSize,
} from '../_config/pagination';

export interface DocumentListItem {
  id: string;
  fileName: string;
  fileType: string;
  signers: string[];
  witnesses: string[];
  creator: string;
  /** RFC de quien creó el documento; null mientras no lo haya registrado en su perfil. */
  creatorRfc?: string | null;
  totalPages: number;
  status: DocumentStatus;
  /**
   * Tipo de firma con el que se firma el documento. Es una decisión del documento —el backend lo
   * copia igual a todos sus firmantes al crearlo— y lo resuelve el listado a partir de ellos.
   * Null en los documentos del endpoint antiguo, que nunca asignó tipo.
   */
  signatureType?: SignatureType | null;
  createdAt: string;
  /**
   * Momento en que el documento quedó firmado por TODOS sus firmantes; null mientras el flujo
   * sigue abierto (o si el backend todavía no lo informa, como en el endpoint antiguo).
   */
  signedAt?: string | null;
  /**
   * Qué papel juega en este documento el usuario en sesión. Lo calcula el backend por fila y es
   * personal: dos personas ven valores distintos para el mismo documento.
   *
   * Con la lista segmentada no hacía falta —la sección lo decía— y por eso puede faltar en los
   * datos de una respuesta anterior; la tabla lo trata entonces como "participante".
   */
  participation?: DocumentParticipation;
}

const STATUS_LABELS: Record<DocumentStatus, string> = {
  [DocumentStatus.Created]: 'Creado',
  [DocumentStatus.PendingApproval]: 'En espera de aprobación',
  [DocumentStatus.PendingSignature]: 'En espera de firma',
  [DocumentStatus.Signed]: 'Firmado por todos',
  [DocumentStatus.Rejected]: 'Rechazado',
  [DocumentStatus.Expired]: 'Expirado',
  [DocumentStatus.CancellationPending]: 'Cancelación pendiente',
  [DocumentStatus.Cancelled]: 'Cancelado',
};

/**
 * Etiquetas cortas a propósito: la tabla ya es ancha y esta columna solo distingue entre los dos
 * tipos. Los nombres largos ("Firma Electrónica Avanzada (e.firma)") viven en el formulario de
 * creación, donde el usuario está eligiendo y necesita la descripción completa.
 */
const SIGNATURE_TYPE_LABELS: Record<SignatureType, string> = {
  [SignatureType.Simple]: 'Simple',
  [SignatureType.Fiel]: 'E.Firma',
  // Sólo para que el mapa siga cubriendo el enum: hoy ningún documento llega con este tipo.
  [SignatureType.BIOMETRIC]: 'Biométrica',
};

/**
 * Por qué este documento está en mi lista. Es la columna que sustituye a la sección: antes lo
 * decía la pantalla en la que uno estaba, y ahora tiene que decirlo cada fila.
 */
const PARTICIPATION_LABELS: Record<DocumentParticipation, string> = {
  [DocumentParticipation.RequiresMySignature]: 'Requiere tu firma',
  [DocumentParticipation.CreatedByMe]: 'Creado por ti',
  [DocumentParticipation.Participant]: 'Participas',
};

/**
 * Lo que muestra "Fecha de firma" cuando no hay fecha que mostrar: el documento todavía no está
 * firmado por todos, o el backend no la informó (endpoint antiguo, dato ilegible). Se lee mejor que
 * un guion en una columna que la mayoría de las veces está vacía. Va sin tooltip (ver
 * `DocumentDate`).
 */
const UNSIGNED_DATE_LABEL = 'No disponible';

/** Tono del punto de cada estatus (ver `StatusIndicator`). */
const STATUS_TONE: Record<DocumentStatus, StatusTone> = {
  [DocumentStatus.Created]: 'warning',
  [DocumentStatus.PendingApproval]: 'warning',
  [DocumentStatus.PendingSignature]: 'warning',
  [DocumentStatus.Signed]: 'success',
  [DocumentStatus.Rejected]: 'danger',
  [DocumentStatus.Expired]: 'neutral',
  [DocumentStatus.CancellationPending]: 'warning',
  [DocumentStatus.Cancelled]: 'neutral',
};

/** Columnas de la tabla; lo usan las filas de estado para ocupar todo el ancho. */
const COLUMN_COUNT = 8;

/** Lo que dice la tabla cuando la consulta respondió sin documentos. */
export const EMPTY_DOCUMENTS_MESSAGE = 'No hay documentos para mostrar.';

interface DocumentsTableProps {
  documents: DocumentListItem[];
  /** Página actual, desde 1. */
  page?: number;
  /**
   * `pagination.totalPages` del backend. Puede ser 0 (sin documentos): la tabla lo trata como
   * una sola página.
   */
  totalPages?: number;
  /** Recibe siempre una página dentro de `[1, totalPages]`: los botones no piden otra. */
  onPageChange?: (page: number) => void;
  /** Tamaño de página elegido; controla el selector "Documentos por página". */
  pageSize?: DocumentsPageSize;
  /** Cambio de tamaño de página. Ausente, el selector se muestra deshabilitado. */
  onPageSizeChange?: (pageSize: DocumentsPageSize) => void;
  /**
   * Navegación al detalle del documento, disparada al seleccionar la fila (clic en cualquier
   * punto de ella, o Enter/Espacio sobre el nombre del documento). Ausente sólo si la vista
   * contenedora no ofrece esa ruta: entonces las filas no son seleccionables.
   */
  onRowSelect?: (documentId: string) => void;
  /**
   * La consulta todavía no tiene datos. Se dibuja un esqueleto dentro de la tarjeta en vez de una
   * tabla vacía, que se leería como "no hay documentos".
   */
  isLoading?: boolean;
  /** Mensaje si la consulta falló; tiene prioridad sobre la lista y sobre el estado vacío. */
  errorMessage?: string;
  /**
   * Lo que se muestra en lugar de las filas cuando la lista llega vacía. Ausente, se muestra
   * `EMPTY_DOCUMENTS_MESSAGE`. Nunca se pinta durante la carga ni con error: esos estados mandan.
   */
  emptyState?: React.ReactNode;
  /**
   * Si el menú de cada fila ofrece "Archivar". En `false` en la vista de archivados: todo lo que
   * hay ahí ya está archivado, y ofrecerlo otra vez sólo movería la fecha.
   */
  canArchiveRows?: boolean;
  /**
   * Si el menú de cada fila ofrece "Recuperar". Sólo en la vista de archivados, que es donde
   * están los documentos que se pueden devolver al listado.
   */
  canRestoreRows?: boolean;
}

/**
 * Permisos con los que se puede archivar: los mismos que dejan ver el documento, porque el
 * backend autoriza `POST /document/:id/archive` con `DOCUMENT + READ` y la misma Policy que el
 * detalle. Archivar sólo lo esconde de la bandeja de quien lo pide, así que no hace falta un
 * permiso más fuerte que el que ya lo pone en ella — y en ningún caso depende de quién lo creó.
 */
export const ARCHIVE_DOCUMENT_PERMISSIONS: readonly PermissionKey[] = [
  'DOCUMENT.READ_OWN',
  'DOCUMENT.READ_ORGANIZATION',
];

function SortableHeader({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1 cursor-pointer select-none">
      {children}
      <ArrowUp className="size-3.5 text-muted-foreground" />
    </span>
  );
}

export default function DocumentsTable({
  documents,
  page = 1,
  totalPages = 1,
  onPageChange,
  pageSize = DEFAULT_DOCUMENTS_PAGE_SIZE,
  onPageSizeChange,
  onRowSelect,
  isLoading = false,
  errorMessage,
  emptyState,
  canArchiveRows = true,
  canRestoreRows = false,
}: DocumentsTableProps) {
  const [shareDoc, setShareDoc] = useState<DocumentListItem | null>(null);
  const [participantsDoc, setParticipantsDoc] =
    useState<DocumentListItem | null>(null);
  const downloadMutation = useDownloadDocument();
  const archiveMutation = useArchiveCompletedDocument();
  const restoreMutation = useRestoreArchivedDocument();
  const { canAny } = usePermissions();
  const canArchiveDocuments = canAny(ARCHIVE_DOCUMENT_PERMISSIONS);

  /**
   * Si hay página anterior o siguiente se deduce de dónde estamos: el endpoint unificado devuelve
   * `page` y `totalPages` y ya no manda `hasNextPage`/`hasPrevPage`. Eran dos campos que repetían
   * lo mismo, y dos fuentes para un mismo hecho terminan discrepando.
   */
  const lastPage = lastDocumentsPage(totalPages);
  const hasPrevPage = page > 1;
  const hasNextPage = page < lastPage;
  const canNavigate = Boolean(onPageChange);

  /**
   * Pide una página sólo si existe y es distinta de la actual: ningún botón puede sacar la tabla
   * del rango, aunque se pulse durante una carga o con un `totalPages` que acaba de cambiar.
   */
  function requestPage(nextPage: number) {
    const target = Math.min(Math.max(nextPage, 1), lastPage);
    if (target !== page) onPageChange?.(target);
  }
  /** Error primero, luego carga: con datos viejos y un error nuevo, lo que importa es el error. */
  const bodyState = errorMessage
    ? 'error'
    : isLoading
      ? 'loading'
      : documents.length === 0
        ? 'empty'
        : 'rows';
  const visibleDocuments = bodyState === 'rows' ? documents : [];

  return (
    <div className="flex-1 min-w-0">
      {/* La tabla vive dentro de una tarjeta blanca (`bg-card`) con borde y encabezado gris, y la
          paginación va en su pie (ver `DataTableCard`, que comparten Miembros y Roles). */}
      <DataTableCard data-slot="documents-table-card">
        <Table aria-busy={bodyState === 'loading' || undefined}>
          <DataTableHeader>
            <TableHead>
              <SortableHeader>Documento</SortableHeader>
            </TableHead>
            <TableHead>Creado por</TableHead>
            <TableHead>Participación</TableHead>
            <TableHead>Estatus</TableHead>
            <TableHead>Fecha de creación</TableHead>
            <TableHead>Fecha de firma</TableHead>
            <TableHead>Tipo de firma</TableHead>
            <DataTableActionsHead />
          </DataTableHeader>
          <TableBody>
            {bodyState === 'error' && (
              <DataTableStateRow
                columnCount={COLUMN_COUNT}
                className="text-destructive"
              >
                <span role="alert">{errorMessage}</span>
              </DataTableStateRow>
            )}
            {bodyState === 'loading' && (
              <DataTableLoadingRows
                columnCount={COLUMN_COUNT}
                label="Cargando documentos"
                rowSlot="documents-loading-row"
              />
            )}
            {bodyState === 'empty' && (
              <DataTableStateRow columnCount={COLUMN_COUNT}>
                {emptyState ?? EMPTY_DOCUMENTS_MESSAGE}
              </DataTableStateRow>
            )}
            {visibleDocuments.map((doc) => {
              const isDownloading =
                downloadMutation.isPending &&
                downloadMutation.variables === doc.id;
              const isArchiving =
                archiveMutation.isPending &&
                archiveMutation.variables === doc.id;
              /**
               * Sólo se archiva lo que ya está firmado por todos, que es lo único que el backend
               * deja archivar.
               *
               * Antes esta condición tenía una mitad más —la sección tenía que ser "Completados"—
               * porque la acción vivía únicamente en esa pantalla. Con la lista unificada ya no
               * hay sección que consultar: la misma tabla muestra a la vez lo pendiente y lo
               * firmado, así que el estatus de CADA documento es lo que decide sobre la fila.
               *
               * La otra mitad es el permiso de la cuenta activa (`ARCHIVE_DOCUMENT_PERMISSIONS`),
               * nunca quién creó el documento: un administrador que ve los documentos de toda la
               * organización puede archivar también los que no creó.
               */
              const canArchive =
                canArchiveRows &&
                canArchiveDocuments &&
                doc.status === DocumentStatus.Signed;
              /**
               * Recuperar pide el mismo permiso que archivar y no mira el estatus: todo lo que
               * aparece en "Archivados" se puede devolver al listado.
               */
              const canRestore = canRestoreRows && canArchiveDocuments;
              const isRestoring =
                restoreMutation.isPending &&
                restoreMutation.variables === doc.id;

              return (
                <TableRow
                  key={doc.id}
                  // La fila entera es el camino al detalle del documento. `TableRow` ya resalta
                  // en hover; el cursor de mano es lo que anuncia que además se puede activar.
                  // Sobre blanco, el `hover:bg-muted/50` del componente casi no se distingue:
                  // aquí se usa el tono completo.
                  className={`hover:bg-muted ${onRowSelect ? 'cursor-pointer' : ''}`}
                  onClick={onRowSelect ? () => onRowSelect(doc.id) : undefined}
                >
                  {/* Ancho fijo (`w-64 max-w-64`) en todas las resoluciones: el nombre se recorta
                    dentro de él en una sola línea y el completo va en el tooltip (ver
                    `DocumentFileName`), así la columna y la altura de la fila no dependen de lo
                    largo que sea. En pantallas angostas la tabla se desplaza en horizontal. */}
                  <TableCell className="w-64 max-w-64 text-emerald-700 dark:text-emerald-400">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <StatusDot tone={STATUS_TONE[doc.status]} />
                      {/* El botón del nombre no lleva `onClick` propio: existe para que la fila sea
                        alcanzable con Tab y activable con Enter/Espacio, que emiten un clic que
                        sube hasta el manejador de la fila. Así la tabla conserva su semántica (un
                        `tr` no es un control) sin dejar fuera al teclado. */}
                      <span className="min-w-0 flex-1">
                        <DocumentFileName
                          fileName={doc.fileName}
                          interactive={Boolean(onRowSelect)}
                        />
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{doc.creator}</span>
                      {doc.creatorRfc && (
                        <span className="text-xs text-muted-foreground">
                          RFC: {doc.creatorRfc}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {
                      PARTICIPATION_LABELS[
                        doc.participation ?? DocumentParticipation.Participant
                      ]
                    }
                  </TableCell>
                  <TableCell>
                    <StatusIndicator
                      tone={STATUS_TONE[doc.status]}
                      label={STATUS_LABELS[doc.status]}
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <DataTableDate date={doc.createdAt} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <DataTableDate
                      date={doc.signedAt}
                      emptyLabel={UNSIGNED_DATE_LABEL}
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {doc.signatureType ? (
                      SIGNATURE_TYPE_LABELS[doc.signatureType]
                    ) : (
                      // Documento anterior a que el tipo de firma se registrara: un guion dice
                      // "no se sabe", que es la verdad; suponer "Simple" sería inventar.
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {/* Las acciones del menú operan sobre el documento o lo consultan en un
                      modal, pero ninguna es una manera de abrirlo: el clic se detiene acá para
                      que usarlas no navegue también al detalle. Incluye la activación por
                      teclado del menú, que también emite un clic sobre el disparador. */}
                    <div
                      className="flex items-center justify-end gap-1"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <DocumentRowActions
                        isDownloading={isDownloading}
                        onDownload={() => downloadMutation.mutate(doc.id)}
                        onViewParticipants={() => setParticipantsDoc(doc)}
                        onShare={() => setShareDoc(doc)}
                        onArchive={
                          canArchive
                            ? () => archiveMutation.mutate(doc.id)
                            : undefined
                        }
                        isArchiving={isArchiving}
                        onRestore={
                          canRestore
                            ? () => restoreMutation.mutate(doc.id)
                            : undefined
                        }
                        isRestoring={isRestoring}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <div
          data-slot="documents-table-pagination"
          className="flex items-center justify-between border-t border-border px-3 py-2"
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span id="documents-page-size-label">Documentos por página</span>
            {/* Controlado: antes era un `defaultValue` sin manejador, así que cambiarlo no pedía
              otra cantidad de documentos. */}
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                const nextPageSize = Number(value);
                if (isDocumentsPageSize(nextPageSize)) {
                  onPageSizeChange?.(nextPageSize);
                }
              }}
              disabled={!onPageSizeChange}
            >
              <SelectTrigger
                size="sm"
                className="w-16"
                aria-labelledby="documents-page-size-label"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENTS_PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1 text-muted-foreground">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Primera página"
              disabled={!canNavigate || !hasPrevPage}
              onClick={() => requestPage(1)}
            >
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Página anterior"
              disabled={!canNavigate || !hasPrevPage}
              onClick={() => requestPage(page - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span
              data-slot="documents-table-page-indicator"
              aria-live="polite"
              className="px-2 text-sm"
            >
              <span className="font-medium text-emerald-600">{page}</span>
              <span className="text-muted-foreground"> de {lastPage}</span>
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Página siguiente"
              disabled={!canNavigate || !hasNextPage}
              onClick={() => requestPage(page + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Última página"
              disabled={!canNavigate || !hasNextPage}
              onClick={() => requestPage(lastPage)}
            >
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
      </DataTableCard>

      <ShareDocumentDialog
        documentId={shareDoc?.id ?? null}
        fileName={shareDoc?.fileName}
        onOpenChange={(open) => !open && setShareDoc(null)}
      />

      <DocumentParticipantsDialog
        documentId={participantsDoc?.id ?? null}
        fileName={participantsDoc?.fileName}
        onOpenChange={(open) => !open && setParticipantsDoc(null)}
      />
    </div>
  );
}
