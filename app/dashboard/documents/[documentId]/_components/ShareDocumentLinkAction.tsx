'use client';

import { Check, Link2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ShareLinkStatus } from '../_hooks/useShareDocumentLink';

interface ShareDocumentLinkActionProps {
  status: ShareLinkStatus;
  /** Solo llega cuando la copia automática falló, para poder copiarlo a mano. */
  publicUrl: string | null;
  onShare: () => void;
  onDismissFallback: () => void;
}

const LABELS: Record<ShareLinkStatus, string> = {
  idle: 'Compartir enlace',
  copying: 'Copiando enlace...',
  copied: 'Enlace copiado',
  error: 'Reintentar copia',
};

/**
 * Acción de compartir del detalle del documento. Presentacional: no sabe de dónde sale la URL ni
 * cómo se copia — recibe estado y callbacks (ver `useShareDocumentLink`).
 *
 * Cuando la copia automática falla no se pierde el enlace: se muestra en un campo de solo lectura
 * que se selecciona al enfocarlo, que es el respaldo para copiarlo a mano.
 */
export default function ShareDocumentLinkAction({
  status,
  publicUrl,
  onShare,
  onDismissFallback,
}: ShareDocumentLinkActionProps) {
  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={status === 'copying'}
        onClick={onShare}
      >
        {status === 'copying' ? (
          <Loader2 className="size-4 animate-spin" />
        ) : status === 'copied' ? (
          <Check className="size-4" />
        ) : (
          <Link2 className="size-4" />
        )}
        {LABELS[status]}
      </Button>

      {status === 'error' && publicUrl && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
        >
          <p>
            No pudimos copiar el enlace automáticamente. Selecciónalo y cópialo
            manualmente:
          </p>
          <Input
            readOnly
            value={publicUrl}
            aria-label="Enlace público del documento"
            onFocus={(event) => event.currentTarget.select()}
            className="bg-background font-mono text-xs"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-end"
            onClick={onDismissFallback}
          >
            Cerrar
          </Button>
        </div>
      )}
    </div>
  );
}
