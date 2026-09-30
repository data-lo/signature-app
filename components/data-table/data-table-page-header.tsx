import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Cabecera de una pantalla de listado: título a la izquierda y las acciones de alta a la
 * derecha, como la de Documentos.
 *
 * En pantallas angostas las acciones bajan debajo del título (`flex-wrap`) en vez de apretarlo.
 *
 * @param props.title - Título de la pantalla (`h1`).
 * @param props.description - Texto de apoyo bajo el título.
 * @param props.actions - Botones de alta (p. ej. "Invitar miembro").
 * @param props.className - Clases extra del contenedor.
 * @returns La cabecera.
 *
 * @example
 * ```tsx
 * <DataTablePageHeader title="Roles y permisos" actions={<CreateRoleButton />} />
 * ```
 */
export function DataTablePageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="data-table-page-header"
      className={cn(
        'flex flex-wrap items-center justify-between gap-4',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
