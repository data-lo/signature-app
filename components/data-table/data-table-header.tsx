import type { ReactNode } from 'react';

import { TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

/**
 * Encabezado de las tablas de listado: franja gris (`bg-muted/60`) con una sola fila que no
 * reacciona al hover, porque no es un registro.
 *
 * @param props.children - Las celdas `TableHead` de las columnas.
 * @returns El `thead` con su fila.
 *
 * @example
 * ```tsx
 * <DataTableHeader>
 *   <TableHead>Nombre</TableHead>
 *   <DataTableActionsHead />
 * </DataTableHeader>
 * ```
 */
export function DataTableHeader({ children }: { children: ReactNode }) {
  return (
    <TableHeader className="bg-muted/60">
      <TableRow className="hover:bg-transparent">{children}</TableRow>
    </TableHeader>
  );
}

/**
 * Encabezado de la columna de acciones, alineado a la derecha como el menú de cada fila.
 *
 * @param props.className - Clases extra de la celda.
 * @returns La celda "Acciones".
 *
 * @example
 * ```tsx
 * {canManage && <DataTableActionsHead />}
 * ```
 */
export function DataTableActionsHead({ className }: { className?: string }) {
  return (
    <TableHead className={cn('text-right', className)}>Acciones</TableHead>
  );
}
