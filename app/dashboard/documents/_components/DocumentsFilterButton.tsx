'use client';

import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import DocumentsFilterPanel from './DocumentsFilterPanel';
import { activeFilterChips, type DocumentsFilters } from '../_config/filters';

interface DocumentsFilterButtonProps {
  filters: DocumentsFilters;
  onChange: (filters: DocumentsFilters) => void;
}

/**
 * Acceso a los filtros, con la cuenta de los que están puestos.
 *
 * El popover NO se cierra al elegir: los filtros se acumulan y cerrarlo tras cada selección
 * obligaría a reabrirlo para poner el siguiente. Antes se cerraba porque había un botón "Aplicar"
 * que marcaba el final de la edición; sin él, el final lo decide quien filtra.
 *
 * La cuenta sale de los mismos chips que se pintan fuera, así que el número del botón y los chips
 * de abajo nunca pueden discrepar.
 */
export default function DocumentsFilterButton({
  filters,
  onChange,
}: DocumentsFilterButtonProps) {
  const [open, setOpen] = useState(false);
  const activeCount = activeFilterChips(filters).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" className="relative gap-2">
            <SlidersHorizontal />
            Filtros
            {activeCount > 0 && (
              <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {activeCount}
              </span>
            )}
          </Button>
        }
      />
      <PopoverContent className="w-96" align="end">
        <DocumentsFilterPanel filters={filters} onChange={onChange} />
      </PopoverContent>
    </Popover>
  );
}
