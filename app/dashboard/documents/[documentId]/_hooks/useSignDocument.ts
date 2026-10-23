'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { signDocumentRequest, type SignDocumentPayload } from '../_requests';

/**
 * Registra la firma del usuario y deja la pantalla lista para confirmarla.
 *
 * **Ya no navega al terminar.** Antes esto empujaba a "Por firmar" dentro del propio `onSuccess`,
 * así que la vista se desmontaba en el mismo instante en que la firma quedaba registrada y el
 * único acuse era un toast que se iba solo. La confirmación es ahora un modal (ver
 * `SignatureSuccessDialog`), y un modal no puede aparecer sobre una pantalla que ya se fue: la
 * navegación se hace al CERRARLO, desde `DocumentViewSection`, que es quien sabe cuándo el
 * firmante terminó de leerlo.
 *
 * Tampoco muestra toast de éxito, por lo mismo: el modal dice más y lo dice mejor. El de error se
 * queda — un fallo no abre ningún modal, y sin él la firma fallaría en silencio.
 *
 * Las invalidaciones sí ocurren aquí y de inmediato: el detalle, la URL del archivo (que pasa a
 * otro bucket al firmarse) y los listados quedan pedidos de nuevo mientras el firmante lee la
 * confirmación, de modo que al cerrarla la pantalla siguiente ya está al día.
 */
export function useSignDocument(documentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    // `payload` ya no es opcional: la geolocalización es obligatoria para firmar.
    mutationFn: (payload: SignDocumentPayload) =>
      signDocumentRequest(documentId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['documentDetail', documentId],
      });
      queryClient.invalidateQueries({
        queryKey: ['documentFileUrl', documentId],
      });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(
          error,
          'Ocurrió un error al firmar el documento. Intenta de nuevo.',
        ),
      );
    },
  });
}
