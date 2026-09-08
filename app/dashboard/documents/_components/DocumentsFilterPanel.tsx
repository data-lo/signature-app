'use client';

import { Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DocumentStatus, DocumentView } from '@/lib/enums/document';
import {
  DEFAULT_DOCUMENTS_FILTERS,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_OPTIONS,
  DOCUMENT_VIEW_LABELS,
  DOCUMENT_VIEW_OPTIONS,
  type DocumentsFilters,
} from '../_config/filters';

interface DocumentsFilterPanelProps {
  filters: DocumentsFilters;
  /** Se llama en CADA cambio: el panel no acumula borrador ni tiene botón de aplicar. */
  onChange: (filters: DocumentsFilters) => void;
}

function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

/**
 * Una opción del panel: encendida o apagada, y se ve cuál es cuál.
 *
 * `aria-pressed` y no un checkbox porque lo que hace no es marcar algo para después: aplica el
 * filtro en el momento. Un checkbox junto a un botón "Aplicar" que no existe sugeriría lo
 * contrario.
 */
function ToggleChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border text-muted-foreground hover:bg-muted'
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Los filtros del listado unificado.
 *
 * **Sin botón "Aplicar" y sin borrador.** Cada selección viaja de inmediato y la lista se
 * actualiza, que es lo que pide el diseño. El panel anterior guardaba un borrador y sólo lo
 * entregaba al pulsar "Aceptar": obligaba a adivinar el resultado antes de verlo, y cerrar el
 * popover por descuido tiraba lo elegido sin avisar. Como cada filtro aplicado aparece además
 * como chip removible fuera del panel, deshacer no necesita volver a abrirlo.
 *
 * La búsqueda libre NO está aquí: vive en la barra de la pantalla, porque es lo que la gente usa
 * primero y esconderla tras un popover la volvería un filtro más.
 */
export default function DocumentsFilterPanel({
  filters,
  onChange,
}: DocumentsFilterPanelProps) {
  function update<K extends keyof DocumentsFilters>(
    key: K,
    value: DocumentsFilters[K],
  ) {
    onChange({ ...filters, [key]: value });
  }

  function toggleStatus(status: DocumentStatus) {
    const next = filters.statuses.includes(status)
      ? filters.statuses.filter((item) => item !== status)
      : [...filters.statuses, status];
    update('statuses', next);
  }

  return (
    <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
      <h3 className="text-sm font-semibold text-foreground">
        Filtrar documentos
      </h3>

      <div>
        <FilterLabel>Participación</FilterLabel>
        {/* Excluyentes entre sí: son cuatro recortes del mismo conjunto, no cuatro casillas.
          Volver a pulsar el que ya está activo regresa a "Todos", que es el estado sin recorte. */}
        <div className="flex flex-wrap gap-1.5">
          {DOCUMENT_VIEW_OPTIONS.map((view) => (
            <ToggleChip
              key={view}
              active={filters.view === view}
              onClick={() =>
                update(
                  'view',
                  filters.view === view ? DocumentView.All : view,
                )
              }
            >
              {DOCUMENT_VIEW_LABELS[view]}
            </ToggleChip>
          ))}
        </div>
      </div>

      <div>
        <FilterLabel>Estado del documento</FilterLabel>
        {/* Acumulables: "pendientes O rechazados" es una pregunta razonable, y el endpoint acepta
          varios estados a la vez. El panel anterior sólo dejaba elegir uno. */}
        <div className="flex flex-wrap gap-1.5">
          {DOCUMENT_STATUS_OPTIONS.map((status) => (
            <ToggleChip
              key={status}
              active={filters.statuses.includes(status)}
              onClick={() => toggleStatus(status)}
            >
              {DOCUMENT_STATUS_LABELS[status]}
            </ToggleChip>
          ))}
        </div>
      </div>

      <div>
        <FilterLabel>Firmantes y revisores</FilterLabel>
        <div className="relative">
          <Users className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Nombre o correo"
            className="pl-8"
            value={filters.participant}
            onChange={(event) => update('participant', event.target.value)}
          />
        </div>
      </div>

      <div>
        <FilterLabel>Fecha de creación</FilterLabel>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            aria-label="Creados desde"
            value={filters.createdFrom}
            onChange={(event) => update('createdFrom', event.target.value)}
          />
          <span className="text-muted-foreground">→</span>
          <Input
            type="date"
            aria-label="Creados hasta"
            value={filters.createdTo}
            onChange={(event) => update('createdTo', event.target.value)}
          />
        </div>
      </div>

      <div>
        <FilterLabel>Fecha de firma</FilterLabel>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            aria-label="Firmados desde"
            value={filters.signedFrom}
            onChange={(event) => update('signedFrom', event.target.value)}
          />
          <span className="text-muted-foreground">→</span>
          <Input
            type="date"
            aria-label="Firmados hasta"
            value={filters.signedTo}
            onChange={(event) => update('signedTo', event.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center justify-end border-t border-border pt-4">
        {/* Conserva la búsqueda escrita: limpiar los filtros no es abandonar lo que se buscaba. */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            onChange({ ...DEFAULT_DOCUMENTS_FILTERS, search: filters.search })
          }
        >
          Limpiar filtros
        </Button>
      </div>
    </div>
  );
}
