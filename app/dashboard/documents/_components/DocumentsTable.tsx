'use client';

import { useState } from 'react';
import {
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  FileDown,
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
import {
  EMPTY_DOCUMENTS_FILTERS,
  type DocumentsFilters,
} from './DocumentsFilterPanel';
import { useDownloadDocument } from '../_hooks/useDownloadDocument';
import { DocumentStatus } from '@/lib/enums/document';

export interface DocumentListItem {
  id: string;
  fileName: string;
  fileType: string;
  signers: string[];
  spectators: string[];
  creator: string;
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

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
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
              <SortableHeader>Nombre del documento</SortableHeader>
            </TableHead>
            <TableHead>Participantes</TableHead>
            <TableHead>
              <SortableHeader>Creado</SortableHeader>
            </TableHead>
            <TableHead>Estado</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
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
                {doc.signers.length > 0 ? (
                  <span>{doc.signers.join(', ')}</span>
                ) : (
                  <span className="italic text-muted-foreground">
                    Sin firmantes asignados
                  </span>
                )}
              </TableCell>
              <TableCell>{formatDate(doc.createdAt)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`size-1.5 shrink-0 rounded-full ${STATUS_DOT[doc.status]}`}
                  />
                  <span>{STATUS_LABELS[doc.status]}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {onSignClick && doc.status === DocumentStatus.Pending ? (
                    <Button
                      variant="brand"
                      size="sm"
                      onClick={() => onSignClick(doc.id)}
                    >
                      FIRMAR
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={
                        downloadMutation.isPending &&
                        downloadMutation.variables === doc.id
                      }
                      onClick={() => downloadMutation.mutate(doc.id)}
                    >
                      {downloadMutation.isPending &&
                      downloadMutation.variables === doc.id
                        ? 'Descargando...'
                        : 'DESCARGAR'}
                      <FileDown className="size-3.5" />
                    </Button>
                  )}
                  {doc.status === DocumentStatus.Signed && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Previsualizar documento firmado"
                      onClick={() => setPreviewDoc(doc)}
                    >
                      <Eye className="size-4" />
                    </Button>
                  )}
                  {onViewDetail &&
                    (doc.status === DocumentStatus.Signed ||
                      doc.status === DocumentStatus.CancellationPending ||
                      doc.status === DocumentStatus.Cancelled) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetail(doc.id)}
                      >
                        Ver detalle
                      </Button>
                    )}
                </div>
              </TableCell>
            </TableRow>
          ))}
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
    </div>
  );
}
