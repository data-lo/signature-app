'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store/useAuthStore';
import {
  DocumentStatus,
  ParticipantRole,
  ParticipantStatus,
} from '@/lib/enums/document';
import { getDocumentDetailRequest, type DocumentDetail } from '../_requests';
import { retryDocumentLoad } from '../_errors';

/** Cada cuánto se vuelve a consultar el detalle mientras un testigo espera su aviso. */
export const WITNESS_NOTIFICATION_POLL_INTERVAL_MS = 3_000;

/**
 * Cuántas consultas del detalle, como máximo, se hacen esperando el aviso a un testigo.
 *
 * El aviso normal llega en segundos; si no llegó tras ~1 minuto lo más probable es que el correo
 * haya fallado, y entonces el testigo se queda en "Pendiente" —que es lo correcto— sin que la
 * pantalla siga consultando mientras esté abierta.
 */
export const WITNESS_NOTIFICATION_MAX_FETCHES = 20;

/**
 * Intervalo con el que volver a consultar el detalle mientras un testigo espera su aviso, o
 * `false` si no hay nada que esperar.
 *
 * El backend pasa al testigo de PENDING a NOTIFIED de forma ASÍNCRONA (Kafka →
 * `SendPendingSignatureNotificationUseCase`), unos segundos después de que el documento entra a
 * firma: al crearlo sin aprobación, o al aprobarlo. El detalle que se pidió en ese intervalo —el
 * que se vuelve a pedir justo después de aprobar, por ejemplo— llega con el testigo todavía en
 * PENDING, y sin volver a consultar la pantalla lo seguía mostrando como "Pendiente".
 *
 * Sólo se espera con el documento en `PENDING_SIGNATURE`: antes (esperando aprobación) el aviso
 * todavía no corresponde, y después (firmado, rechazado, cancelado) un testigo en PENDING es uno
 * al que el correo le falló, no uno en camino.
 *
 * @param detail - Último detalle recibido; `undefined` mientras no haya llegado ninguno.
 * @param fetchCount - Consultas exitosas hechas hasta ahora (`dataUpdateCount` de React Query).
 * @returns El intervalo en milisegundos, o `false` para no volver a consultar.
 *
 * @example
 * ```ts
 * witnessNotificationPollInterval(detail, query.state.dataUpdateCount); // 3000 | false
 * ```
 */
export function witnessNotificationPollInterval(
  detail: DocumentDetail | undefined,
  fetchCount: number,
): number | false {
  if (!detail || detail.status !== DocumentStatus.PendingSignature) {
    return false;
  }

  if (fetchCount >= WITNESS_NOTIFICATION_MAX_FETCHES) {
    return false;
  }

  const hasWitnessAwaitingNotice = detail.participants.some(
    (participant) =>
      participant.role === ParticipantRole.Witness &&
      participant.status === ParticipantStatus.Pending,
  );

  return hasWitnessAwaitingNotice
    ? WITNESS_NOTIFICATION_POLL_INTERVAL_MS
    : false;
}

/**
 * Detalle de un documento, consultado desde la cuenta activa.
 *
 * La cuenta va en la llave por lo mismo que en `useDocuments`: el backend decide el acceso con
 * el `X-Account-Id` de la petición, así que la respuesta de una cuenta no sirve para otra, y
 * `useSwitchActiveAccount` sólo puede tirar del caché lo que lleve la cuenta en la llave. Sin
 * ella, quien cambiaba de cuenta con el documento abierto seguía viendo lo que respondió la
 * anterior. Por la misma razón espera a que la cuenta activa se hidrate: sin `X-Account-Id` el
 * backend responde 403 y la pantalla diría "sin permiso" a quien sí lo tiene.
 *
 * **Nunca se da por fresco (`staleTime: 0`).** Los estatus de los participantes cambian por
 * acciones de otras personas y por procesos del backend —el aviso a los testigos, sobre todo—, y
 * con los 5 minutos por omisión del `QueryClient` entrar al detalle o abrir "Ver participantes"
 * mostraba lo que se consultó antes, con el testigo todavía en "Pendiente". Así cada vez que se
 * monta vuelve a consultarse; el caché sigue sirviendo para pintar algo mientras llega la
 * respuesta. Y mientras un testigo espera su aviso, se vuelve a consultar solo (ver
 * `witnessNotificationPollInterval`).
 *
 * @param documentId - Documento a consultar.
 * @param options.enabled - Para quien sólo lo necesita en ciertos momentos (diálogos, migas).
 * @returns La consulta de React Query del detalle.
 *
 * @example
 * ```ts
 * const { data, isPending, error } = useDocumentDetail('doc-1');
 * ```
 */
export function useDocumentDetail(
  documentId: string,
  options?: { enabled?: boolean },
) {
  const activeAccountId = useAuthStore((state) => state.activeAccount?.id);

  return useQuery({
    queryKey: ['documentDetail', documentId, activeAccountId],
    queryFn: () => getDocumentDetailRequest(documentId),
    enabled: (options?.enabled ?? true) && Boolean(activeAccountId),
    retry: retryDocumentLoad,
    staleTime: 0,
    refetchInterval: (query) =>
      witnessNotificationPollInterval(
        query.state.data,
        query.state.dataUpdateCount,
      ),
  });
}
