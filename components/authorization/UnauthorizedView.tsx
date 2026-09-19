import Link from 'next/link';
import { ShieldOff } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface UnauthorizedViewProps {
  /** Qué se intentó abrir, cuando decirlo ayuda. Omitirlo deja el texto genérico. */
  section?: string;
  /** A dónde vuelve el botón. Por defecto, el listado de documentos. */
  backHref?: string;
}

/**
 * Pantalla de acceso denegado.
 *
 * Dice quién puede darle acceso —su administrador— en vez de qué permiso le falta: el nombre
 * técnico (`BILLING.READ`) no le sirve de nada a quien lo lee y sí le cuenta a un curioso cómo
 * está repartido el control interno de la organización.
 *
 * Es un Server Component: no necesita permisos para renderizarse, sólo explicarlos.
 *
 * @example
 * ```tsx
 * <UnauthorizedView section="Pagos" />
 * ```
 */
export function UnauthorizedView({
  section,
  backHref = '/dashboard/documents',
}: UnauthorizedViewProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-500/10">
        <ShieldOff className="size-7 text-orange-600 dark:text-orange-400" />
      </div>

      <div className="space-y-1">
        <h1 className="font-heading text-xl font-semibold text-foreground">
          No tienes acceso a esta sección
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          {section
            ? `Tu rol en esta cuenta no incluye ${section}. `
            : 'Tu rol en esta cuenta no incluye esta sección. '}
          Si necesitas entrar, pídeselo a quien administra la organización.
        </p>
      </div>

      <Button render={<Link href={backHref} />} variant="outline">
        Volver
      </Button>
    </div>
  );
}
