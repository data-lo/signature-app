import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const alertVariants = cva(
  'relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border px-4 py-3 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current',
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground',
        destructive:
          'border-destructive/30 bg-destructive/5 text-destructive [&>svg]:text-current *:data-[slot=alert-description]:text-destructive/90',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

/**
 * Contenedor de aviso de shadcn/ui: ícono opcional como primer hijo, `AlertTitle` y
 * `AlertDescription`. Se anuncia con `role="alert"`.
 *
 * @param props - Props de un `div` más `variant` (`default` | `destructive`).
 * @returns El contenedor del aviso.
 *
 * @example
 * ```tsx
 * <Alert variant="destructive">
 *   <AlertTitle>Error</AlertTitle>
 *   <AlertDescription>No se pudo guardar.</AlertDescription>
 * </Alert>
 * ```
 */
function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

/**
 * Título de un `Alert`; ocupa la columna del texto, a la derecha del ícono.
 *
 * @param props - Props de un `div`.
 * @returns El título del aviso.
 *
 * @example
 * ```tsx
 * <AlertTitle>Error</AlertTitle>
 * ```
 */
function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        'col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Cuerpo de un `Alert`; ocupa la columna del texto, a la derecha del ícono.
 *
 * @param props - Props de un `div`.
 * @returns La descripción del aviso.
 *
 * @example
 * ```tsx
 * <AlertDescription>No se pudo guardar.</AlertDescription>
 * ```
 */
function AlertDescription({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        'col-start-2 grid justify-items-start gap-1 text-sm text-muted-foreground [&_p]:leading-relaxed',
        className,
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription, alertVariants };
