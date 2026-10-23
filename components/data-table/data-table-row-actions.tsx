'use client';

import type { ReactNode } from 'react';
import { MoreVertical } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/**
 * Menú contextual de una fila: el botón de tres puntos y la lista de acciones alineada a la
 * derecha.
 *
 * Sólo pone el disparador y el contenedor; las opciones (`DropdownMenuItem`) las decide cada
 * tabla, que es la que sabe qué se puede hacer con sus registros y con qué permiso. El
 * disparador lleva nombre accesible propio porque una fila puede tener más de un botón (p. ej.
 * el contador de permisos), y "el primer botón de la fila" no lo identificaría.
 *
 * @param props.label - Nombre accesible del disparador (p. ej. "Acciones de ana@acme.com").
 * @param props.children - Las opciones del menú.
 * @param props.contentClassName - Clases extra del contenedor de opciones (p. ej. su ancho).
 * @returns El menú de la fila.
 *
 * @example
 * ```tsx
 * <DataTableRowActions label={`Acciones de ${role.name}`}>
 *   <DropdownMenuItem onClick={() => onEdit(role)}>Editar</DropdownMenuItem>
 * </DataTableRowActions>
 * ```
 */
export function DataTableRowActions({
  label,
  children,
  contentClassName,
}: {
  label: string;
  children: ReactNode;
  contentClassName?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={label} />}
      >
        <MoreVertical className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={cn('w-44', contentClassName)}>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
