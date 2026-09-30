import type { ReactNode } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

/** Lo que muestra el cuerpo de una tabla de listado en un momento dado. */
export type DataTableBodyState = 'error' | 'loading' | 'empty' | 'rows';

/** Filas del esqueleto de carga: las suficientes para que la tarjeta no salte al llegar los datos. */
export const DATA_TABLE_LOADING_ROW_COUNT = 5;

/**
 * Decide qué pinta el cuerpo de la tabla.
 *
 * El orden es la regla: error primero —con datos viejos y un error nuevo, lo que importa es el
 * error—, luego carga, luego vacío; sólo si no aplica ninguno se pintan las filas.
 *
 * @param state.errorMessage - Mensaje si la consulta falló.
 * @param state.isLoading - Si la consulta todavía no tiene datos.
 * @param state.rowCount - Cuántos registros llegaron.
 * @returns El estado del cuerpo.
 *
 * @example
 * ```ts
 * resolveDataTableBodyState({ isLoading: false, rowCount: 0 }); // 'empty'
 * ```
 */
export function resolveDataTableBodyState({
  errorMessage,
  isLoading = false,
  rowCount,
}: {
  errorMessage?: string;
  isLoading?: boolean;
  rowCount: number;
}): DataTableBodyState {
  if (errorMessage) return 'error';
  if (isLoading) return 'loading';
  return rowCount === 0 ? 'empty' : 'rows';
}

/**
 * Fila que ocupa todo el ancho de la tabla para los estados sin registros (vacío o error). No
 * reacciona al hover: no es un registro y no se puede seleccionar.
 *
 * @param props.columnCount - Columnas de la tabla, para que la celda las cubra todas.
 * @param props.children - Contenido de la fila.
 * @param props.className - Clases extra de la celda (p. ej. el color del error).
 * @returns Una fila con una sola celda de ancho completo.
 *
 * @example
 * ```tsx
 * <DataTableStateRow columnCount={6}>No hay miembros para mostrar.</DataTableStateRow>
 * ```
 */
export function DataTableStateRow({
  columnCount,
  children,
  className,
}: {
  columnCount: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell
        colSpan={columnCount}
        className={cn(
          'h-24 text-center whitespace-normal text-muted-foreground',
          className,
        )}
      >
        {children}
      </TableCell>
    </TableRow>
  );
}

/**
 * Esqueleto de carga: `rowCount` filas de barras con el ancho de la tabla.
 *
 * Es sólo visual; el anuncio para lectores de pantalla lo hace el `aria-busy` de la tabla y el
 * texto `sr-only` (`label`) de la primera fila.
 *
 * @param props.columnCount - Columnas de la tabla.
 * @param props.label - Lo que se anuncia mientras carga (p. ej. "Cargando roles").
 * @param props.rowSlot - `data-slot` de cada fila, para las pruebas de cada tabla.
 * @param props.rowCount - Cuántas filas dibujar.
 * @returns Las filas del esqueleto.
 *
 * @example
 * ```tsx
 * <DataTableLoadingRows columnCount={5} label="Cargando roles" rowSlot="roles-loading-row" />
 * ```
 */
export function DataTableLoadingRows({
  columnCount,
  label,
  rowSlot = 'data-table-loading-row',
  rowCount = DATA_TABLE_LOADING_ROW_COUNT,
}: {
  columnCount: number;
  label: string;
  rowSlot?: string;
  rowCount?: number;
}) {
  return Array.from({ length: rowCount }, (_, index) => (
    <TableRow key={index} data-slot={rowSlot} className="hover:bg-transparent">
      <TableCell colSpan={columnCount} className="py-3">
        {index === 0 && (
          <span role="status" className="sr-only">
            {label}
          </span>
        )}
        <Skeleton className="h-5 w-full" />
      </TableCell>
    </TableRow>
  ));
}
