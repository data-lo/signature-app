'use client';

import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import DocumentsFilterPanel, { EMPTY_DOCUMENTS_FILTERS, type DocumentsFilters } from './DocumentsFilterPanel';

interface DocumentsFilterButtonProps {
  filters: DocumentsFilters;
  onApply: (filters: DocumentsFilters) => void;
  showMyTurnFilter?: boolean;
  showStatusFilter?: boolean;
}

function countActiveFilters(filters: DocumentsFilters): number {
  return Object.entries(filters).filter(([key, value]) => {
    const emptyValue = EMPTY_DOCUMENTS_FILTERS[key as keyof DocumentsFilters];
    return value !== emptyValue;
  }).length;
}

export default function DocumentsFilterButton({
  filters,
  onApply,
  showMyTurnFilter,
  showStatusFilter,
}: DocumentsFilterButtonProps) {
  const [open, setOpen] = useState(false);
  const activeCount = countActiveFilters(filters);

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
      }}
    >
      <PopoverTrigger
        render={
          <Button variant="outline" size="icon-sm" aria-label="Filtrar documentos" className="relative">
            <SlidersHorizontal />
            {activeCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {activeCount}
              </span>
            )}
          </Button>
        }
      />
      <PopoverContent className="w-96" align="end">
        <DocumentsFilterPanel
          initialFilters={filters}
          showMyTurnFilter={showMyTurnFilter}
          showStatusFilter={showStatusFilter}
          onApply={(next) => {
            onApply(next);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
