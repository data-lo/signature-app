'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type StepState = 'done' | 'active' | 'blocked';

interface IdentityStepperProps {
  identity: StepState;
  signature: StepState;
}

const STEP_STYLES: Record<StepState, string> = {
  done: 'text-emerald-700 dark:text-emerald-400',
  active: 'text-foreground font-medium',
  blocked: 'text-muted-foreground',
};

/**
 * Los dos pasos del flujo, siempre visibles: "1. Validar identidad → 2. Registrar firma".
 *
 * Se muestra el paso 2 incluso cuando está bloqueado. Ocultarlo haría que el usuario no supiera
 * que después de Didit todavía le falta subir su firma, y la pantalla parecería terminar antes
 * de tiempo.
 */
export default function IdentityStepper({
  identity,
  signature,
}: IdentityStepperProps) {
  return (
    <ol className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
      <li className={cn('flex items-center gap-1.5', STEP_STYLES[identity])}>
        {identity === 'done' ? (
          <Check className="size-4" aria-hidden />
        ) : (
          <span aria-hidden>1.</span>
        )}
        {identity === 'done' ? 'Identidad validada' : 'Validar identidad'}
      </li>

      <span aria-hidden className="text-muted-foreground">
        →
      </span>

      <li className={cn('flex items-center gap-1.5', STEP_STYLES[signature])}>
        {signature === 'done' ? (
          <Check className="size-4" aria-hidden />
        ) : (
          <span aria-hidden>2.</span>
        )}
        {signature === 'done'
          ? 'Firma registrada'
          : signature === 'active'
            ? 'Registrar firma'
            : 'Firma bloqueada'}
      </li>
    </ol>
  );
}
