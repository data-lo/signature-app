'use client';

import { ArrowUp, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
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
import { EMPTY_DOCUMENTS_FILTERS, type DocumentsFilters } from './DocumentsFilterPanel';

export type DocumentListStatus =
  | 'created'
  | 'pending'
  | 'signed'
  | 'rejected'
  | 'expired'
  | 'cancellation_pending'
  | 'cancelled';

export interface DocumentListItem {
  id: string;
  fileName: string;
  fileType: string;
  signers: string[];
  spectators: string[];
  creator: string;
  totalPages: number;
  status: DocumentListStatus;
  createdAt: string;
}

const STATUS_LABELS: Record<DocumentListStatus, string> = {
  created: 'Creado',
  pending: 'En progreso',
  signed: 'Firmado por todos',
  rejected: 'Rechazado',
  expired: 'Expirado',
  cancellation_pending: 'Cancelación pendiente',
  cancelled: 'Cancelado',
};

const STATUS_DOT: Record<DocumentListStatus, string> = {
  created: 'bg-amber-400',
  pending: 'bg-amber-400',
  signed: 'bg-emerald-500',
  rejected: 'bg-red-400',
  expired: 'bg-gray-400',
  cancellation_pending: 'bg-amber-400',
  cancelled: 'bg-gray-400',
};

interface DocumentsTableProps {
  documents: DocumentListItem[];
  page?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
  onPageChange?: (page: number) => void;
  onSignClick?: (documentId: string) => void;
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
  filters,
  onFiltersChange,
  showMyTurnFilter,
  showStatusFilter,
}: DocumentsTableProps) {
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
                  <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${STATUS_DOT[doc.status]}`} />
                  <span className="min-w-0 flex-1 break-words">{doc.fileName}</span>
                </div>
              </TableCell>
              <TableCell>
                {doc.signers.length > 0 ? (
                  <span>{doc.signers.join(', ')}</span>
                ) : (
                  <span className="italic text-muted-foreground">Sin firmantes asignados</span>
                )}
              </TableCell>
              <TableCell>{formatDate(doc.createdAt)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <span className={`size-1.5 shrink-0 rounded-full ${STATUS_DOT[doc.status]}`} />
                  <span>{STATUS_LABELS[doc.status]}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {onSignClick && doc.status === 'pending' ? (
                    <Button variant="brand" size="sm" onClick={() => onSignClick(doc.id)}>
                      FIRMAR
                    </Button>
                  ) : (
                    <Button variant="secondary" size="sm">
                      DESCARGAR
                      <ChevronDown className="size-3.5" />
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
          <span className="px-2 text-sm font-medium text-emerald-600">{page}</span>
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
  );
}
