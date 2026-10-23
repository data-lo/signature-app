'use client';

import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { getDocumentFileUrlRequest } from '../_requests';

/**
 * Dispara la bajada del archivo sin sacar al usuario de la tabla.
 *
 * Un enlace temporal y no `window.open`: la URL viene firmada con una cabecera de descarga, así
 * que el navegador guarda el archivo en vez de navegar, y `window.open` sólo agregaba una pestaña
 * en blanco que se cerraba sola.
 *
 * El atributo `download` va sin valor a propósito. El nombre lo manda el servidor en el
 * `Content-Disposition` de la respuesta; en una URL de otro origen —MinIO lo es— el navegador
 * ignora el nombre que ponga el atributo, así que escribirlo acá daría la falsa impresión de que
 * esta capa decide cómo se llama el archivo.
 */
function triggerBrowserDownload(url: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = '';
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Descarga el PDF de un documento desde cualquiera de los listados.
 *
 * Pide la URL en su variante de descarga (`download: true`), que es la que baja el archivo con el
 * nombre del documento. Antes se pedía la misma URL que usa el visor y el archivo aterrizaba
 * llamándose como la clave del objeto en MinIO —un UUID—, que no le dice nada a quien lo recibe.
 */
export function useDownloadDocument() {
  return useMutation({
    mutationFn: (documentId: string) =>
      getDocumentFileUrlRequest(documentId, { download: true }),
    onSuccess: ({ secureUrl }) => {
      triggerBrowserDownload(secureUrl);
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(
          error,
          'Ocurrió un error al descargar el documento. Intenta de nuevo.',
        ),
      );
    },
  });
}
