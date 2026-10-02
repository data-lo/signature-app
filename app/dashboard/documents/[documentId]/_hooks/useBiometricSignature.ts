'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { useAuthStore } from '@/lib/store/useAuthStore';
import {
  biometricPollInterval,
  type BiometricGeolocation,
} from '@/lib/biometric-signature';
import {
  getBiometricSignatureRequest,
  startBiometricSignatureRequest,
} from '../_requests';

/**
 * Llave del estado biométrico. Lleva la cuenta activa, igual que el detalle: el backend autoriza
 * con el `X-Account-Id`, y el intento de una cuenta no debe mostrarse desde otra.
 *
 * @param documentId - Documento consultado.
 * @param activeAccountId - Cuenta activa, o `undefined` mientras no se hidrata.
 * @returns La llave de React Query.
 *
 * @example
 * ```ts
 * biometricSignatureQueryKey('doc-1', 'acc-1'); // ['biometricSignature', 'doc-1', 'acc-1']
 * ```
 */
export function biometricSignatureQueryKey(
  documentId: string,
  activeAccountId: string | undefined,
) {
  return ['biometricSignature', documentId, activeAccountId] as const;
}

/**
 * Estado de la firma biométrica del usuario sobre un documento, sondeado mientras está en curso.
 *
 * Al cargar la pantalla recupera la sesión que el firmante hubiera dejado abierta: una recarga
 * vuelve a mostrar el mismo QR sin abrir otra sesión en Didit.
 *
 * @param documentId - Documento a firmar.
 * @param options.enabled - Sólo se consulta para un firmante biométrico que puede firmar.
 * @returns La consulta de React Query; `data` es `null` si nunca inició una sesión.
 *
 * @example
 * ```ts
 * const { data: session } = useBiometricSignature('doc-1', { enabled: isBiometricSigner });
 * ```
 */
export function useBiometricSignature(
  documentId: string,
  options: { enabled: boolean },
) {
  const activeAccountId = useAuthStore((state) => state.activeAccount?.id);

  return useQuery({
    queryKey: biometricSignatureQueryKey(documentId, activeAccountId),
    queryFn: () => getBiometricSignatureRequest(documentId),
    enabled: options.enabled && Boolean(activeAccountId),
    refetchInterval: (query) => biometricPollInterval(query.state.data),
    // El firmante se va a Didit (otra pestaña o el celular) y vuelve: al recuperar el foco se
    // refresca en el acto, sin esperar al siguiente sondeo.
    refetchOnWindowFocus: true,
    staleTime: 0,
    retry: false,
  });
}

/**
 * Inicia (o retoma) la sesión de Didit con la que el firmante autoriza su firma biométrica.
 *
 * La respuesta se escribe directo en el caché del estado: la pantalla muestra el QR en el acto y
 * el sondeo arranca desde ahí, sin esperar a otra consulta. Los errores (documento que ya no
 * admite la firma, Didit caído) se avisan con un toast.
 *
 * @param documentId - Documento a firmar.
 * @returns La mutación; `mutate(geolocation)` abre la sesión.
 *
 * @example
 * ```ts
 * const start = useStartBiometricSignature('doc-1');
 * start.mutate({ latitude: 19.43, longitude: -99.13 });
 * ```
 */
export function useStartBiometricSignature(documentId: string) {
  const queryClient = useQueryClient();
  const activeAccountId = useAuthStore((state) => state.activeAccount?.id);

  return useMutation({
    mutationFn: (geolocation: BiometricGeolocation) =>
      startBiometricSignatureRequest(documentId, geolocation),
    onSuccess: (session) => {
      queryClient.setQueryData(
        biometricSignatureQueryKey(documentId, activeAccountId),
        session,
      );
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(
          error,
          'No se pudo iniciar la firma biométrica. Intenta de nuevo.',
        ),
      );
    },
  });
}
