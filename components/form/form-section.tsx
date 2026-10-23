'use client';

import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { FieldError } from '@/components/ui/field';
import { cn } from '@/lib/utils';

export interface FormSectionProps {
  title?: ReactNode;
  description?: ReactNode;
  /** `false` atenúa la sección y bloquea la interacción con su contenido. */
  isEnabled?: boolean;
  isLoading?: boolean;
  loadingMessage?: string;
  hasError?: boolean;
  errorMessage?: string;
  /** Qué le falta al usuario para habilitar la sección; se muestra solo si está deshabilitada. */
  missingRequirementMessage?: string;
  className?: string;
  contentClassName?: string;
  children?: ReactNode;
}

/**
 * Envoltura común de las secciones de un formulario: título, estado de carga, estado
 * deshabilitado (con el requisito que falta) y error general de la sección. Centraliza cómo se
 * ve cada uno de esos estados para que todas las secciones se comporten igual, y deja a cada
 * sección solo su contenido.
 *
 * Deshabilitada usa `inert` además de la atenuación visual: sin `inert`, el contenido seguiría
 * siendo enfocable con el teclado aunque se vea apagado.
 */
export function FormSection({
  title,
  description,
  isEnabled = true,
  isLoading = false,
  loadingMessage,
  hasError = false,
  errorMessage,
  missingRequirementMessage,
  className,
  contentClassName,
  children,
}: FormSectionProps) {
  return (
    <section
      data-slot="form-section"
      aria-busy={isLoading || undefined}
      aria-disabled={!isEnabled || undefined}
      className={cn('flex flex-col gap-3', className)}
    >
      {(title !== undefined || description !== undefined) && (
        <header className="flex flex-col gap-1">
          {title !== undefined && (
            <h2 className="text-sm font-medium text-foreground">{title}</h2>
          )}
          {description !== undefined && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </header>
      )}

      {isLoading && loadingMessage && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {loadingMessage}
        </p>
      )}

      {!isEnabled && missingRequirementMessage && (
        <p className="text-sm text-muted-foreground">
          {missingRequirementMessage}
        </p>
      )}

      {children !== undefined && children !== null && (
        <div
          inert={!isEnabled}
          className={cn(
            !isEnabled && 'pointer-events-none opacity-50 select-none',
            contentClassName,
          )}
        >
          {children}
        </div>
      )}

      {hasError && errorMessage && <FieldError>{errorMessage}</FieldError>}
    </section>
  );
}
