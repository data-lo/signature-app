import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { SigningCredentialStatus } from '@/lib/enums/identity';
import { getCurrentIdentityVerificationRequest } from '@/app/dashboard/personal-documents/identity/_requests';
import { IDENTITY_VERIFICATION_QUERY_KEY } from '@/app/dashboard/personal-documents/identity/_hooks/useIdentityVerification';
import { useBiometricIdentityCheck } from './useBiometricIdentityCheck';

jest.mock('@/app/dashboard/personal-documents/identity/_requests');

const mockedGetCurrent = getCurrentIdentityVerificationRequest as jest.Mock;

function currentIdentity(signingCredentialStatus: SigningCredentialStatus) {
  return {
    verification: null,
    signingCredentialStatus,
    signingCredentialConfigured:
      signingCredentialStatus === SigningCredentialStatus.Configured,
    identityVerifiedAt: null,
    signatureRegistered: false,
  };
}

function renderCheck(queryClient = new QueryClient()) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useBiometricIdentityCheck(), { wrapper });
}

describe('useBiometricIdentityCheck', () => {
  beforeEach(() => mockedGetCurrent.mockReset());

  it('resuelve false si la identidad todavía no está verificada', async () => {
    mockedGetCurrent.mockResolvedValue(
      currentIdentity(SigningCredentialStatus.IdentityVerificationRequired),
    );
    const { result } = renderCheck();

    let verified: boolean | undefined;
    await act(async () => {
      verified = await result.current();
    });

    expect(verified).toBe(false);
  });

  it('resuelve true con la identidad aprobada, aunque falte la firma PNG', async () => {
    mockedGetCurrent.mockResolvedValue(
      currentIdentity(SigningCredentialStatus.SignaturePending),
    );
    const { result } = renderCheck();

    let verified: boolean | undefined;
    await act(async () => {
      verified = await result.current();
    });

    expect(verified).toBe(true);
  });

  /** Quien acaba de validar su identidad en otra pestaña tiene que poder firmar sin recargar. */
  it('consulta el estado en cada intento, aunque haya uno en caché', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(
      IDENTITY_VERIFICATION_QUERY_KEY,
      currentIdentity(SigningCredentialStatus.IdentityVerificationRequired),
    );
    mockedGetCurrent.mockResolvedValue(
      currentIdentity(SigningCredentialStatus.Configured),
    );
    const { result } = renderCheck(queryClient);

    let verified: boolean | undefined;
    await act(async () => {
      verified = await result.current();
    });

    expect(mockedGetCurrent).toHaveBeenCalledTimes(1);
    expect(verified).toBe(true);
  });

  it('si la consulta falla no bloquea: el backend tiene la última palabra', async () => {
    mockedGetCurrent.mockRejectedValue(new Error('Network Error'));
    const { result } = renderCheck(
      new QueryClient({ defaultOptions: { queries: { retry: false } } }),
    );

    let verified: boolean | undefined;
    await act(async () => {
      verified = await result.current();
    });

    expect(verified).toBe(true);
  });
});
