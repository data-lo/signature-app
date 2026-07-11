'use client';

import { useState } from 'react';
import { Search, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DocumentListStatus } from './DocumentsTable';

export interface DocumentsFilters {
  fileName: string;
  participantName: string;
  status: DocumentListStatus | '';
  createdFrom: string;
  createdTo: string;
  signedFrom: string;
  signedTo: string;
  myTurnOnly: boolean;
}

export const EMPTY_DOCUMENTS_FILTERS: DocumentsFilters = {
  fileName: '',
  participantName: '',
  status: '',
  createdFrom: '',
  createdTo: '',
  signedFrom: '',
  signedTo: '',
  myTurnOnly: false,
};

const STATUS_OPTIONS: { value: DocumentListStatus; label: string }[] = [
  { value: 'created', label: 'Creado' },
  { value: 'pending', label: 'En progreso' },
  { value: 'signed', label: 'Firmado por todos' },
  { value: 'rejected', label: 'Rechazado' },
  { value: 'expired', label: 'Expirado' },
  { value: 'cancellation_pending', label: 'Cancelación pendiente' },
  { value: 'cancelled', label: 'Cancelado' },
];

export function buildDocumentsFilterParams(
  filters: DocumentsFilters,
): Record<string, string | boolean> {
  const params: Record<string, string | boolean> = {};

  if (filters.fileName) params.fileName = filters.fileName;
  if (filters.participantName) params.participantName = filters.participantName;
  if (filters.status) params.status = filters.status;
  if (filters.createdFrom) params.dateFrom = filters.createdFrom;
  if (filters.createdTo) params.dateTo = filters.createdTo;
  if (filters.signedFrom) params.signedDateFrom = filters.signedFrom;
  if (filters.signedTo) params.signedDateTo = filters.signedTo;
  if (filters.myTurnOnly) params.myTurnOnly = true;

  return params;
}

function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

interface DocumentsFilterPanelProps {
  initialFilters: DocumentsFilters;
  showMyTurnFilter?: boolean;
  showStatusFilter?: boolean;
  onApply: (filters: DocumentsFilters) => void;
}

export default function DocumentsFilterPanel({
  initialFilters,
  showMyTurnFilter,
  showStatusFilter = true,
  onApply,
}: DocumentsFilterPanelProps) {
  const [draft, setDraft] = useState<DocumentsFilters>(initialFilters);

  function update<K extends keyof DocumentsFilters>(
    key: K,
    value: DocumentsFilters[K],
  ) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
      <h3 className="text-sm font-semibold text-foreground">
        Filtrar documentos
      </h3>

      {showMyTurnFilter && (
        <div className="flex items-center justify-between gap-2">
          <FilterLabel>Requiere mi firma o revisión</FilterLabel>
          <Switch
            checked={draft.myTurnOnly}
            onCheckedChange={(checked) => update('myTurnOnly', checked)}
          />
        </div>
      )}

      <div>
        <FilterLabel>Nombre del documento</FilterLabel>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Ingresa una palabra o frase"
            className="pl-8"
            value={draft.fileName}
            onChange={(event) => update('fileName', event.target.value)}
          />
        </div>
      </div>

      <div>
        <FilterLabel>Firmantes y revisores</FilterLabel>
        <div className="relative">
          <Users className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar"
            className="pl-8"
            value={draft.participantName}
            onChange={(event) => update('participantName', event.target.value)}
          />
        </div>
      </div>

      {showStatusFilter && (
        <div>
          <FilterLabel>Estado del documento</FilterLabel>
          <Select
            value={draft.status || null}
            onValueChange={(value) =>
              update('status', (value ?? '') as DocumentListStatus | '')
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona uno" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <FilterLabel>Fecha de firma</FilterLabel>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={draft.signedFrom}
            onChange={(event) => update('signedFrom', event.target.value)}
          />
          <span className="text-muted-foreground">→</span>
          <Input
            type="date"
            value={draft.signedTo}
            onChange={(event) => update('signedTo', event.target.value)}
          />
        </div>
      </div>

      <div>
        <FilterLabel>Fecha de creación</FilterLabel>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={draft.createdFrom}
            onChange={(event) => update('createdFrom', event.target.value)}
          />
          <span className="text-muted-foreground">→</span>
          <Input
            type="date"
            value={draft.createdTo}
            onChange={(event) => update('createdTo', event.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setDraft(EMPTY_DOCUMENTS_FILTERS)}
        >
          Limpiar
        </Button>
        <Button type="button" size="sm" onClick={() => onApply(draft)}>
          Aceptar
        </Button>
      </div>
    </div>
  );
}
