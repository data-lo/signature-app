import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { BiometricSignatureStatus } from '@/lib/enums/document';
import { useAuthStore } from '@/lib/store/useAuthStore';
import {
  getBiometricSignatureRequest,
  startBiometricSignatureRequest,
  type BiometricSignatureSession,
} from '../_requests';
import {
  BIOMETRIC_POLL_INTERVAL_MS,
  biometricPollInterval,
  biometricSignatureQueryKey,
  useBiometricSignature,
  useStartBiometricSignature,
} from './useBiometricSignature';

jest.mock('../_requests');
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const mockedGet = getBiometricSignatureRequest as jest.Mock;
const mockedStart = startBiometricSignatureRequest as jest.Mock;

function session(
  overrides: Partial<BiometricSignatureSession> = {},
): BiometricSignatureSession {
  return {
    attemptId: 'attempt-1',
    status: BiometricSignatureStatus.Pending,
    url: 'https://verify.didit.me/session/abc',
    expiresAt: null,
    reused: false,
    signatureCompleted: false,
    documentCompleted: false,
    ...overrides,
  };
}

function wrapperWith(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('biometricPollInterval', () => {
  it.each([
    BiometricSignatureStatus.Pending,
    BiometricSignatureStatus.InProgress,
    BiometricSignatureStatus.InReview,
  ])('sondea mientras la sesión está %s', (status) => {
    expect(biometricPollInterval(session({ status }))).toBe(
      BIOMETRIC_POLL_INTERVAL_MS,
    );
  });

  it('sigue sondeando con la biometría aprobada hasta que la firma queda registrada', () => {
    expect(
      biometricPollInterval(
        session({ status: BiometricSignatureStatus.Approved }),
      ),
    ).toBe(BIOMETRIC_POLL_INTERVAL_MS);
    expect(
      biometricPollInterval(
        session({
          status: BiometricSignatureStatus.Approved,
          signatureCompleted: true,
        }),
      ),
    ).toBe(false);
  });

  it.each([
    BiometricSignatureStatus.Declined,
    BiometricSignatureStatus.Expired,
    BiometricSignatureStatus.Abandoned,
    BiometricSignatureStatus.Failed,
  ])('no sondea en un desenlace (%s)', (status) => {
    expect(biometricPollInterval(session({ status }))).toBe(false);
  });

  it('no sondea sin intento', () => {
    expect(biometricPollInterval(null)).toBe(false);
  });
});

describe('useBiometricSignature', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedStart.mockReset();
    useAuthStore.setState({
      activeAccount: {
        id: 'account-1',
        accountType: 'PERSONAL',
        organizationId: null,
        roleId: null,
      },
    });
  });

  it('no consulta nada si el usuario no es firmante biométrico', () => {
    renderHook(() => useBiometricSignature('doc-1', { enabled: false }), {
      wrapper: wrapperWith(new QueryClient()),
    });

    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('recupera la sesión abierta al cargar la pantalla', async () => {
    mockedGet.mockResolvedValue(session({ reused: true }));
    const { result } = renderHook(
      () => useBiometricSignature('doc-1', { enabled: true }),
      { wrapper: wrapperWith(new QueryClient()) },
    );

    await waitFor(() =>
      expect(result.current.data?.attemptId).toBe('attempt-1'),
    );
  });

  it('al iniciar, deja la sesión en el caché del estado para mostrar el QR en el acto', async () => {
    const started = session();
    mockedStart.mockResolvedValue(started);
    const queryClient = new QueryClient();
    const { result } = renderHook(() => useStartBiometricSignature('doc-1'), {
      wrapper: wrapperWith(queryClient),
    });

    result.current.mutate({ latitude: 19.43, longitude: -99.13 });

    await waitFor(() =>
      expect(
        queryClient.getQueryData(
          biometricSignatureQueryKey('doc-1', 'account-1'),
        ),
      ).toEqual(started),
    );
    expect(mockedStart).toHaveBeenCalledWith('doc-1', {
      latitude: 19.43,
      longitude: -99.13,
    });
  });
});
