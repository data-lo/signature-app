'use client';

import { ChevronDown, Columns3, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DOCUMENT_COLUMNS, type DocumentColumnId } from '../_config/columns';

interface DocumentsColumnsMenuProps {
  /** Columnas visibles, en el orden de la tabla. */
  visibleColumns: readonly DocumentColumnId[];
  /** Se llama al marcar o desmarcar una columna. */
  onColumnVisibilityChange: (
    columnId: DocumentColumnId,
    visible: boolean,
  ) => void;
  /** Vuelve a la configuración predeterminada. */
  onReset: () => void;
  /** Si la configuración actual ya es la predeterminada; deshabilita "Restablecer columnas". */
  isDefault: boolean;
}

/**
 * Botón "Personalizar columnas" de la tabla de documentos, con el menú para mostrar u ocultar
 * cada columna.
 *
 * Cada opción es un `menuitemcheckbox` con `aria-checked`, así que el lector de pantalla anuncia
 * si la columna está visible, y se marca con Enter o Espacio. El menú NO se cierra al marcar: se
 * suelen ajustar varias columnas seguidas. "Documento" aparece marcada y deshabilitada porque no
 * se puede ocultar; la columna de acciones ni siquiera aparece, porque siempre se muestra.
 *
 * @param props.visibleColumns - Columnas visibles.
 * @param props.onColumnVisibilityChange - Cambio de visibilidad de una columna.
 * @param props.onReset - Restablece la configuración predeterminada.
 * @param props.isDefault - Si ya se está en la configuración predeterminada.
 * @returns El botón con su menú desplegable.
 *
 * @throws Nada.
 *
 * @example
 * ```tsx
 * <DocumentsColumnsMenu
 *   visibleColumns={visibleColumns}
 *   onColumnVisibilityChange={setColumnVisibility}
 *   onReset={resetColumns}
 *   isDefault={isDefault}
 * />
 * ```
 */
export default function DocumentsColumnsMenu({
  visibleColumns,
  onColumnVisibilityChange,
  onReset,
  isDefault,
}: DocumentsColumnsMenuProps) {
  const visible = new Set(visibleColumns);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" className="gap-2">
            <Columns3 aria-hidden="true" />
            Personalizar columnas
            <ChevronDown aria-hidden="true" className="text-muted-foreground" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Columnas visibles</DropdownMenuLabel>
          {DOCUMENT_COLUMNS.map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.alwaysVisible || visible.has(column.id)}
              disabled={column.alwaysVisible}
              onCheckedChange={(checked) =>
                onColumnVisibilityChange(column.id, checked)
              }
            >
              {column.label}
              {column.alwaysVisible && (
                <span className="ml-auto text-xs text-muted-foreground">
                  Siempre visible
                </span>
              )}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={isDefault} onClick={onReset}>
          <RotateCcw aria-hidden="true" />
          Restablecer columnas
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
