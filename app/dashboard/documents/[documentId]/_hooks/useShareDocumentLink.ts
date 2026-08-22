'use client';

import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { copyTextToClipboard } from '@/lib/clipboard';
import { buildPublicDocumentUrl } from '@/lib/document-public-url';

/**
 * `idle` sin intentar todavía · `copying` mientras se resuelve la copia · `copied` éxito ·
 * `error` la copia automática no fue posible y el enlace se ofrece para copiar a mano.
 */
export type ShareLinkStatus = 'idle' | 'copying' | 'copied' | 'error';

export const LINK_COPIED_MESSAGE = 'Enlace copiado';
export const LINK_COPY_FAILED_MESSAGE =
  'No pudimos copiar el enlace automáticamente. Cópialo manualmente.';

/**
 * Lógica de la acción "Compartir enlace" del detalle del documento: resuelve la URL pública y la
 * copia al portapapeles en un solo paso, sin diálogo intermedio.
 *
 * La URL se resuelve al activar la acción y no al renderizar: `buildPublicDocumentUrl` lee
 * `window.location.origin`, que en el render del servidor no existe — calcularla arriba dejaría el
 * HTML servido con la ruta relativa y el del cliente con la absoluta (desajuste de hidratación).
 *
 * No hay llamada al backend: el enlace es determinista a partir del id y el visor público ya
 * decide qué mostrar según el estatus (`GET /document/public/:id`). El estado `copying` existe
 * igual porque `navigator.clipboard.writeText` es asíncrono y puede quedar esperando el permiso
 * del navegador.
 */
export function useShareDocumentLink(documentId: string) {
  const [status, setStatus] = useState<ShareLinkStatus>('idle');
  // Solo se publica cuando la copia automática falló: es el respaldo para copiarlo a mano.
  const [publicUrl, setPublicUrl] = useState<string | null>(null);

  const share = useCallback(async () => {
    setStatus('copying');
    const url = buildPublicDocumentUrl(documentId);

    if (await copyTextToClipboard(url)) {
      setPublicUrl(null);
      setStatus('copied');
      toast.success(LINK_COPIED_MESSAGE);
      return;
    }

    setPublicUrl(url);
    setStatus('error');
    toast.error(LINK_COPY_FAILED_MESSAGE);
  }, [documentId]);

  const dismissFallback = useCallback(() => {
    setPublicUrl(null);
    setStatus('idle');
  }, []);

  return { status, publicUrl, share, dismissFallback };
}
