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
import { Skeleton } from '@/components/ui/skeleton';
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
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import DocumentRowActions from './DocumentRowActions';
import DocumentParticipantsDialog from './DocumentParticipantsDialog';
import ShareDocumentDialog from './ShareDocumentDialog';
import { useDownloadDocument } from '../_hooks/useDownloadDocument';
import { useArchiveCompletedDocument } from '../_hooks/useArchiveCompletedDocument';
import DocumentDate from './DocumentDate';
import {
  DocumentParticipation,
  DocumentStatus,
  SignatureType,
} from '@/lib/enums/document';

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

const STATUS_DOT: Record<DocumentStatus, string> = {
  [DocumentStatus.Created]: 'bg-amber-400',
  [DocumentStatus.PendingApproval]: 'bg-amber-400',
  [DocumentStatus.PendingSignature]: 'bg-amber-400',
  [DocumentStatus.Signed]: 'bg-emerald-500',
  [DocumentStatus.Rejected]: 'bg-red-400',
  [DocumentStatus.Expired]: 'bg-gray-400',
  [DocumentStatus.CancellationPending]: 'bg-amber-400',
  [DocumentStatus.Cancelled]: 'bg-gray-400',
};

/** Columnas de la tabla; lo usan las filas de estado para ocupar todo el ancho. */
const COLUMN_COUNT = 8;

/** Filas del esqueleto de carga: las suficientes para que la tarjeta no salte al llegar los datos. */
const LOADING_ROW_COUNT = 5;

/** Lo que dice la tabla cuando la consulta respondió sin documentos. */
export const EMPTY_DOCUMENTS_MESSAGE = 'No hay documentos para mostrar.';

interface DocumentsTableProps {
  documents: DocumentListItem[];
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
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
}

/**
 * Fila que ocupa todo el ancho de la tabla para los estados sin documentos (vacío o error). No
 * reacciona al hover: no es un documento y no se puede seleccionar.
 *
 * @param props.children - Contenido de la fila.
 * @param props.className - Clases extra de la celda (p. ej. el color del error).
 * @returns Una fila con una sola celda de ancho completo.
 *
 * @example
 * ```tsx
 * <DocumentsStateRow>No hay documentos para mostrar.</DocumentsStateRow>
 * ```
 */
function DocumentsStateRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell
        colSpan={COLUMN_COUNT}
        className={`h-24 text-center whitespace-normal text-muted-foreground ${className ?? ''}`}
      >
        {children}
      </TableCell>
    </TableRow>
  );
}

/**
 * Esqueleto de carga de la tabla: `LOADING_ROW_COUNT` filas de barras con el ancho de la tabla.
 * Es sólo visual; el anuncio para lectores de pantalla lo hace el `aria-busy` de la tabla y el
 * texto `sr-only` de la primera fila.
 *
 * @returns Las filas del esqueleto.
 *
 * @example
 * ```tsx
 * <TableBody>{isLoading && <DocumentsLoadingRows />}</TableBody>
 * ```
 */
function DocumentsLoadingRows() {
  return Array.from({ length: LOADING_ROW_COUNT }, (_, index) => (
    <TableRow
      key={index}
      data-slot="documents-loading-row"
      className="hover:bg-transparent"
    >
      <TableCell colSpan={COLUMN_COUNT} className="py-3">
        {index === 0 && (
          <span role="status" className="sr-only">
            Cargando documentos
          </span>
        )}
        <Skeleton className="h-5 w-full" />
      </TableCell>
    </TableRow>
  ));
}

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
  onRowSelect,
  isLoading = false,
  errorMessage,
}: DocumentsTableProps) {
  const [shareDoc, setShareDoc] = useState<DocumentListItem | null>(null);
  const [participantsDoc, setParticipantsDoc] =
    useState<DocumentListItem | null>(null);
  const downloadMutation = useDownloadDocument();
  const archiveMutation = useArchiveCompletedDocument();

  /**
   * Si hay página anterior o siguiente se deduce de dónde estamos: el endpoint unificado devuelve
   * `page` y `totalPages` y ya no manda `hasNextPage`/`hasPrevPage`. Eran dos campos que repetían
   * lo mismo, y dos fuentes para un mismo hecho terminan discrepando.
   */
  const hasPrevPage = page > 1;
  const hasNextPage = page < totalPages;
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
          paginación va en su pie: sobre el fondo beige de la aplicación, la tarjeta es lo que
          separa la lista del resto de la pantalla. Los ajustes se hacen con `className` sobre los
          componentes de shadcn y no en `components/ui/table`, que también usan MembersTable y
          RolesTable. `bg-card` y no `bg-white` para que el tema oscuro siga funcionando. */}
      <div
        data-slot="documents-table-card"
        className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xs"
      >
        <Table aria-busy={bodyState === 'loading' || undefined}>
          <TableHeader className="bg-muted/60">
            <TableRow className="hover:bg-transparent">
              <TableHead>
                <SortableHeader>Documento</SortableHeader>
              </TableHead>
              <TableHead>Creado por</TableHead>
              <TableHead>Participación</TableHead>
              <TableHead>Estatus</TableHead>
              <TableHead>Fecha de creación</TableHead>
              <TableHead>Fecha de firma</TableHead>
              <TableHead>Tipo de firma</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bodyState === 'error' && (
              <DocumentsStateRow className="text-destructive">
                <span role="alert">{errorMessage}</span>
              </DocumentsStateRow>
            )}
            {bodyState === 'loading' && <DocumentsLoadingRows />}
            {bodyState === 'empty' && (
              <DocumentsStateRow>{EMPTY_DOCUMENTS_MESSAGE}</DocumentsStateRow>
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
               * firmado, así que el estatus de CADA documento es lo único que puede decidirlo.
               */
              const canArchive = doc.status === DocumentStatus.Signed;

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
                  <TableCell className="w-64 max-w-64 whitespace-normal text-emerald-700 dark:text-emerald-400">
                    <div className="flex items-start gap-1.5">
                      <span
                        className={`mt-1.5 size-1.5 shrink-0 rounded-full ${STATUS_DOT[doc.status]}`}
                      />
                      <span className="min-w-0 flex-1 break-words">
                        {onRowSelect ? (
                          // El botón no lleva `onClick` propio: existe para que la fila sea
                          // alcanzable con Tab y activable con Enter/Espacio, que emiten un clic
                          // y éste sube hasta el manejador de la fila. Así la tabla conserva su
                          // semántica (un `tr` no es un control) sin dejar fuera al teclado.
                          <button
                            type="button"
                            className="rounded-sm text-left break-words outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                          >
                            {doc.fileName}
                          </button>
                        ) : (
                          doc.fileName
                        )}
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
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`size-1.5 shrink-0 rounded-full ${STATUS_DOT[doc.status]}`}
                      />
                      <span>{STATUS_LABELS[doc.status]}</span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <DocumentDate date={doc.createdAt} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <DocumentDate
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
            <span>Documentos por página</span>
            <Select defaultValue="25">
              <SelectTrigger size="sm" className="w-16">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1 text-muted-foreground">
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={!onPageChange || !hasPrevPage}
              onClick={() => onPageChange?.(1)}
            >
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={!onPageChange || !hasPrevPage}
              onClick={() => onPageChange?.(page - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="px-2 text-sm font-medium text-emerald-600">
              {page}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={!onPageChange || !hasNextPage}
              onClick={() => onPageChange?.(page + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={!onPageChange || !hasNextPage}
              onClick={() => onPageChange?.(totalPages)}
            >
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

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
