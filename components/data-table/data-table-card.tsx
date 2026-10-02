import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/**
 * Tarjeta que envuelve las tablas de listado: fondo `bg-card`, borde, esquinas redondeadas y
 * sombra suave.
 *
 * Es el contenedor que estrenó la tabla de Documentos. Sobre el fondo beige de la aplicación la
 * tarjeta es lo que separa la lista del resto de la pantalla; `bg-card` y no `bg-white` para que
 * el tema oscuro siga funcionando. El pie (p. ej. la paginación) va dentro de la misma tarjeta,
 * como hijo después de la tabla.
 *
 * El `data-slot` por omisión es `data-table-card`; cada tabla puede darle el suyo para que sus
 * pruebas la encuentren sin depender de las clases.
 *
 * @param props - Atributos de un `div`; `className` se suma a los estilos de la tarjeta.
 * @returns El contenedor de la tabla.
 *
 * @example
 * ```tsx
 * <DataTableCard data-slot="roles-table-card">
 *   <Table>...</Table>
 * </DataTableCard>
 * ```
 */
export function DataTableCard({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="data-table-card"
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xs',
        className,
      )}
      {...props}
    />
  );
}
