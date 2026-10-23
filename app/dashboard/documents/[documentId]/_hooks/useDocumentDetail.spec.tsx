import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, type AxiosResponse } from 'axios';
import type { ReactNode } from 'react';
import {
  useDocumentDetail,
  witnessNotificationPollInterval,
  WITNESS_NOTIFICATION_MAX_FETCHES,
  WITNESS_NOTIFICATION_POLL_INTERVAL_MS,
} from './useDocumentDetail';
import {
  getDocumentDetailRequest,
  type DocumentDetail,
  type DocumentParticipant,
} from '../_requests';
import { useAuthStore } from '@/lib/store/useAuthStore';
import {
  DocumentStatus,
  ParticipantRole,
  ParticipantStatus,
} from '@/lib/enums/document';

jest.mock('../_requests');

const mockedGetDocumentDetailRequest = getDocumentDetailRequest as jest.Mock;

let queryClient: QueryClient;

/** Sin `retry` en los valores por omisión: la política que se prueba es la del propio hook. */
function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function setActiveAccount(id: string | null) {
  useAuthStore.setState({
    activeAccount: id
      ? {
          id,
          accountType: 'ORGANIZATION',
          organizationId: `org-of-${id}`,
          roleId: 'role-1',
        }
      : null,
  });
}

describe('useDocumentDetail', () => {
  beforeEach(() => {
    queryClient = new QueryClient();
    mockedGetDocumentDetailRequest.mockReset();
    mockedGetDocumentDetailRequest.mockResolvedValue({ id: 'doc-1' });
  });

  it('no consulta hasta que la cuenta activa se hidrata: sin X-Account-Id el backend responde 403', () => {
    setActiveAccount(null);

    const { result } = renderHook(() => useDocumentDetail('doc-1'), {
      wrapper,
    });

    expect(result.current.isPending).toBe(true);
    expect(mockedGetDocumentDetailRequest).not.toHaveBeenCalled();
  });

  it('guarda el detalle bajo la cuenta activa, para que cambiar de cuenta no reutilice el de la anterior', async () => {
    setActiveAccount('account-1');

    const { result } = renderHook(() => useDocumentDetail('doc-1'), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(
      queryClient.getQueryData(['documentDetail', 'doc-1', 'account-1']),
    ).toEqual({ id: 'doc-1' });
  });

  it('no reintenta un 403: responde en el primer intento', async () => {
    setActiveAccount('account-1');
    mockedGetDocumentDetailRequest.mockRejectedValue(
      new AxiosError('Forbidden', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 403,
        data: {},
      } as AxiosResponse),
    );

    const { result } = renderHook(() => useDocumentDetail('doc-1'), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockedGetDocumentDetailRequest).toHaveBeenCalledTimes(1);
  });
});

function buildParticipant(
  overrides: Partial<DocumentParticipant> = {},
): DocumentParticipant {
  return {
    id: 'part-1',
    userId: null,
    email: 'persona@correo.com',
    name: 'Persona Uno',
    role: ParticipantRole.Signer,
    status: ParticipantStatus.Pending,
    cancellationReason: null,
    ...overrides,
  };
}

function buildDetail(
  witnessStatus: ParticipantStatus,
  overrides: Partial<DocumentDetail> = {},
): DocumentDetail {
  return {
    id: 'doc-1',
    fileName: 'contrato.pdf',
    fileType: 'application/pdf',
    totalPages: 1,
    status: DocumentStatus.PendingSignature,
    creator: 'Creador Uno',
    secureUrl: 'https://minio/contrato.pdf',
    expiresIn: 3600,
    participants: [
      buildParticipant({ id: 'signer-1', role: ParticipantRole.Signer }),
      buildParticipant({
        id: 'witness-1',
        role: ParticipantRole.Witness,
        status: witnessStatus,
      }),
    ],
    myRole: ParticipantRole.Creator,
    myStatus: null,
    mySignatureType: null,
    canSign: false,
    canReject: false,
    canRequestCancellation: false,
    canConfirmCancellation: false,
    requiresVerification: false,
    verificationConfirmed: false,
    ...overrides,
  };
}

/** Estatus del testigo en el último detalle que devolvió el hook. */
function witnessStatusOf(detail: DocumentDetail | undefined) {
  return detail?.participants.find((p) => p.role === ParticipantRole.Witness)
    ?.status;
}

/**
 * Historia "Actualizar estado de testigo a 'Notificado' al consultar el documento": el backend
 * marca al testigo NOTIFIED unos segundos DESPUÉS de que el documento entra a firma (Kafka), y
 * el detalle pedido en ese intervalo se quedaba en caché con el testigo en "Pendiente".
 */
describe('witnessNotificationPollInterval', () => {
  it('testigo pendiente con el documento en firma: vuelve a consultar', () => {
    expect(
      witnessNotificationPollInterval(
        buildDetail(ParticipantStatus.Pending),
        1,
      ),
    ).toBe(WITNESS_NOTIFICATION_POLL_INTERVAL_MS);
  });

  it('testigo ya notificado: no hay nada que esperar', () => {
    expect(
      witnessNotificationPollInterval(
        buildDetail(ParticipantStatus.Notified),
        1,
      ),
    ).toBe(false);
  });

  it('documento esperando aprobación: el aviso todavía no corresponde', () => {
    expect(
      witnessNotificationPollInterval(
        buildDetail(ParticipantStatus.Pending, {
          status: DocumentStatus.PendingApproval,
        }),
        1,
      ),
    ).toBe(false);
  });

  it('documento ya cerrado con el testigo pendiente (el correo falló): no consulta', () => {
    expect(
      witnessNotificationPollInterval(
        buildDetail(ParticipantStatus.Pending, {
          status: DocumentStatus.Signed,
        }),
        1,
      ),
    ).toBe(false);
  });

  it('deja de consultar al llegar al tope, aunque el testigo siga pendiente', () => {
    expect(
      witnessNotificationPollInterval(
        buildDetail(ParticipantStatus.Pending),
        WITNESS_NOTIFICATION_MAX_FETCHES,
      ),
    ).toBe(false);
  });

  it('sólo los testigos cuentan: un firmante pendiente no dispara consultas', () => {
    expect(
      witnessNotificationPollInterval(
        buildDetail(ParticipantStatus.Notified, {
          participants: [
            buildParticipant({ role: ParticipantRole.Signer }),
            buildParticipant({
              id: 'reviewer-1',
              role: ParticipantRole.Reviewer,
            }),
          ],
        }),
        1,
      ),
    ).toBe(false);
  });

  it('sin detalle todavía: no consulta', () => {
    expect(witnessNotificationPollInterval(undefined, 0)).toBe(false);
  });
});

describe('useDocumentDetail: estatus del testigo', () => {
  beforeEach(() => {
    queryClient = new QueryClient();
    mockedGetDocumentDetailRequest.mockReset();
    setActiveAccount('account-1');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('vuelve a consultar al entrar de nuevo al detalle, en vez de mostrar el que quedó en caché', async () => {
    mockedGetDocumentDetailRequest
      .mockResolvedValueOnce(buildDetail(ParticipantStatus.Pending))
      .mockResolvedValue(buildDetail(ParticipantStatus.Notified));

    const first = renderHook(() => useDocumentDetail('doc-1'), { wrapper });
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    first.unmount();

    const second = renderHook(() => useDocumentDetail('doc-1'), { wrapper });

    await waitFor(() =>
      expect(witnessStatusOf(second.result.current.data)).toBe(
        ParticipantStatus.Notified,
      ),
    );
    expect(mockedGetDocumentDetailRequest).toHaveBeenCalledTimes(2);
  });

  it('testigo pendiente → notificado: se actualiza solo, sin recargar, y deja de consultar', async () => {
    jest.useFakeTimers();
    mockedGetDocumentDetailRequest
      .mockResolvedValueOnce(buildDetail(ParticipantStatus.Pending))
      .mockResolvedValue(buildDetail(ParticipantStatus.Notified));

    const { result } = renderHook(() => useDocumentDetail('doc-1'), {
      wrapper,
    });
    await waitFor(() =>
      expect(witnessStatusOf(result.current.data)).toBe(
        ParticipantStatus.Pending,
      ),
    );

    await act(async () => {
      await jest.advanceTimersByTimeAsync(
        WITNESS_NOTIFICATION_POLL_INTERVAL_MS,
      );
    });
    await waitFor(() =>
      expect(witnessStatusOf(result.current.data)).toBe(
        ParticipantStatus.Notified,
      ),
    );
    const callsWhenNotified = mockedGetDocumentDetailRequest.mock.calls.length;

    await act(async () => {
      await jest.advanceTimersByTimeAsync(
        WITNESS_NOTIFICATION_POLL_INTERVAL_MS * 5,
      );
    });
    expect(mockedGetDocumentDetailRequest).toHaveBeenCalledTimes(
      callsWhenNotified,
    );
  });

  it('fallo de notificación: el testigo sigue "Pendiente" y las consultas se detienen en el tope', async () => {
    jest.useFakeTimers();
    mockedGetDocumentDetailRequest.mockResolvedValue(
      buildDetail(ParticipantStatus.Pending),
    );

    const { result } = renderHook(() => useDocumentDetail('doc-1'), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await act(async () => {
      await jest.advanceTimersByTimeAsync(
        WITNESS_NOTIFICATION_POLL_INTERVAL_MS *
          (WITNESS_NOTIFICATION_MAX_FETCHES + 10),
      );
    });

    expect(mockedGetDocumentDetailRequest).toHaveBeenCalledTimes(
      WITNESS_NOTIFICATION_MAX_FETCHES,
    );
    expect(witnessStatusOf(result.current.data)).toBe(
      ParticipantStatus.Pending,
    );
  });
});
