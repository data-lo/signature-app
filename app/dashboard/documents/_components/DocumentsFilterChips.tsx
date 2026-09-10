'use client';

import { X } from 'lucide-react';
import { activeFilterChips, type DocumentsFilters } from '../_config/filters';

interface DocumentsFilterChipsProps {
  filters: DocumentsFilters;
  onChange: (filters: DocumentsFilters) => void;
}

/**
 * Los filtros puestos, a la vista y removibles de uno en uno.
 *
 * Existen porque la lista dejó de estar segmentada: cuando el recorte era la pantalla, bastaba
 * mirar el sidebar para saber qué se estaba viendo. Ahora todo ocurre en la misma vista, y sin
 * esto un resultado vacío no distingue "no hay documentos" de "quedó un filtro puesto de hace
 * diez minutos" — que es la manera más fácil de creer que un documento se perdió.
 *
 * Quitar un chip aplica el cambio de inmediato, como ponerlo: no hay estado intermedio que
 * confirmar.
 */
export default function DocumentsFilterChips({
  filters,
  onChange,
}: DocumentsFilterChipsProps) {
  const chips = activeFilterChips(filters);

  if (chips.length === 0) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 py-1 pr-1 pl-2.5 text-xs text-foreground"
        >
          {chip.label}
          <button
            type="button"
            aria-label={`Quitar filtro: ${chip.label}`}
            onClick={() => onChange(chip.remove(filters))}
            className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
    </div>
  );
}
