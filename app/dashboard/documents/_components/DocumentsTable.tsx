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
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import DocumentsFilterButton from './DocumentsFilterButton';
import DocumentPreviewDialog from './DocumentPreviewDialog';
import DocumentRowActions from './DocumentRowActions';
import ShareDocumentDialog from './ShareDocumentDialog';
import {
  EMPTY_DOCUMENTS_FILTERS,
  type DocumentsFilters,
} from './DocumentsFilterPanel';
import { useDownloadDocument } from '../_hooks/useDownloadDocument';
import { formatLongDateTime } from '@/lib/format-datetime';
import { DocumentStatus } from '@/lib/enums/document';

export interface DocumentListItem {
  id: string;
  fileName: string;
  fileType: string;
  signers: string[];
  spectators: string[];
  creator: string;
  /** RFC de quien creó el documento; null mientras no lo haya registrado en su perfil. */
  creatorRfc?: string | null;
  totalPages: number;
  status: DocumentStatus;
  createdAt: string;
}

const STATUS_LABELS: Record<DocumentStatus, string> = {
  [DocumentStatus.Created]: 'Creado',
  [DocumentStatus.Pending]: 'En progreso',
  [DocumentStatus.Signed]: 'Firmado por todos',
  [DocumentStatus.Rejected]: 'Rechazado',
  [DocumentStatus.Expired]: 'Expirado',
  [DocumentStatus.CancellationPending]: 'Cancelación pendiente',
  [DocumentStatus.Cancelled]: 'Cancelado',
};

const STATUS_DOT: Record<DocumentStatus, string> = {
  [DocumentStatus.Created]: 'bg-amber-400',
  [DocumentStatus.Pending]: 'bg-amber-400',
  [DocumentStatus.Signed]: 'bg-emerald-500',
  [DocumentStatus.Rejected]: 'bg-red-400',
  [DocumentStatus.Expired]: 'bg-gray-400',
  [DocumentStatus.CancellationPending]: 'bg-amber-400',
  [DocumentStatus.Cancelled]: 'bg-gray-400',
};

interface DocumentsTableProps {
  documents: DocumentListItem[];
  page?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
  onPageChange?: (page: number) => void;
  onSignClick?: (documentId: string) => void;
  onViewDetail?: (documentId: string) => void;
  filters?: DocumentsFilters;
  onFiltersChange?: (filters: DocumentsFilters) => void;
  showMyTurnFilter?: boolean;
  showStatusFilter?: boolean;
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
  hasNextPage = false,
  hasPrevPage = false,
  onPageChange,
  onSignClick,
  onViewDetail,
  filters,
  onFiltersChange,
  showMyTurnFilter,
  showStatusFilter,
}: DocumentsTableProps) {
  const [previewDoc, setPreviewDoc] = useState<DocumentListItem | null>(null);
  const [shareDoc, setShareDoc] = useState<DocumentListItem | null>(null);
  const downloadMutation = useDownloadDocument();

  return (
    <div className="flex-1 min-w-0">
      {onFiltersChange && (
        <div className="mb-3 flex items-center justify-end">
          <DocumentsFilterButton
            filters={filters ?? EMPTY_DOCUMENTS_FILTERS}
            onApply={onFiltersChange}
            showMyTurnFilter={showMyTurnFilter}
            showStatusFilter={showStatusFilter}
          />
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <SortableHeader>Documento</SortableHeader>
            </TableHead>
            <TableHead>Creado por</TableHead>
            <TableHead>
              <SortableHeader>Creado el</SortableHeader>
            </TableHead>
            <TableHead>Estado de firma</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => {
            const isDownloading =
              downloadMutation.isPending &&
              downloadMutation.variables === doc.id;

            return (
              <TableRow key={doc.id}>
                <TableCell className="w-64 max-w-64 whitespace-normal text-emerald-700 dark:text-emerald-400">
                  <div className="flex items-start gap-1.5">
                    <span
                      className={`mt-1.5 size-1.5 shrink-0 rounded-full ${STATUS_DOT[doc.status]}`}
                    />
                    <span className="min-w-0 flex-1 break-words">
                      {doc.fileName}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{doc.creator}</span>
                    {doc.creatorRfc && (
                      <span className="text-xs text-muted-foreground">
                        {doc.creatorRfc}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatLongDateTime(doc.createdAt)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`size-1.5 shrink-0 rounded-full ${STATUS_DOT[doc.status]}`}
                    />
                    <span>{STATUS_LABELS[doc.status]}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    {/* La firma sigue siendo la acción primaria de "Por firmar", así que conserva
                        su botón propio; el resto de acciones vive en el menú de tres puntos. */}
                    {onSignClick && doc.status === DocumentStatus.Pending && (
                      <Button
                        variant="brand"
                        size="sm"
                        onClick={() => onSignClick(doc.id)}
                      >
                        FIRMAR
                      </Button>
                    )}
                    <DocumentRowActions
                      isDownloading={isDownloading}
                      onDownload={() => downloadMutation.mutate(doc.id)}
                      onViewDetail={
                        onViewDetail ? () => onViewDetail(doc.id) : undefined
                      }
                      onShare={() => setShareDoc(doc)}
                      onPreview={
                        doc.status === DocumentStatus.Signed
                          ? () => setPreviewDoc(doc)
                          : undefined
                      }
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <div className="mt-4 flex items-center justify-between">
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

      <DocumentPreviewDialog
        documentId={previewDoc?.id ?? null}
        fileName={previewDoc?.fileName}
        onOpenChange={(open) => !open && setPreviewDoc(null)}
      />

      <ShareDocumentDialog
        documentId={shareDoc?.id ?? null}
        fileName={shareDoc?.fileName}
        onOpenChange={(open) => !open && setShareDoc(null)}
      />
    </div>
  );
}
