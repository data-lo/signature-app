import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';
import { useRegister } from './useRegister';
import { registerRequest, type RegisterRequestValues } from '../_requests';
import { setPendingRegistrationContext } from '@/lib/pending-registration-context';

const dto: RegisterRequestValues = {
  firstName: 'Ana',
  lastName: 'Gómez',
  email: 'ana@empresa.com',
  nationalId: 'GOMA900101MDFRNN01',
  rfc: 'GOMA900101ABC',
  password: 'Password123!',
  confirmPassword: 'Password123!',
  turnstileToken: '0.token-del-widget',
};

jest.mock('../_requests');
jest.mock('@/lib/pending-registration-context');
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const push = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

const mockedRegisterRequest = registerRequest as jest.Mock;
const mockedSetPendingRegistrationContext =
  setPendingRegistrationContext as jest.Mock;

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useRegister', () => {
  beforeEach(() => {
    mockedRegisterRequest.mockReset();
    mockedSetPendingRegistrationContext.mockReset();
    push.mockReset();
  });

  it('guarda el contexto de pre-registro y manda a /signup/verify (pre-cuenta nueva)', async () => {
    mockedRegisterRequest.mockResolvedValue({
      userId: 'user-1',
      email: 'ana@empresa.com',
      maskedEmail: 'a***a@empresa.com',
      isNewPreRegistration: true,
    });
    const { result } = renderHook(() => useRegister(), { wrapper });

    act(() => {
      result.current.mutate(dto);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedSetPendingRegistrationContext).toHaveBeenCalledWith({
      email: 'ana@empresa.com',
      maskedEmail: 'a***a@empresa.com',
      isNewPreRegistration: true,
    });
    expect(push).toHaveBeenCalledWith('/signup/verify');
  });

  it('bug corregido: con CURP ya pendiente (Caso A), igual manda a /signup/verify con isNewPreRegistration:false', async () => {
    mockedRegisterRequest.mockResolvedValue({
      userId: 'existing-user',
      email: 'original@empresa.com',
      maskedEmail: 'o***l@empresa.com',
      isNewPreRegistration: false,
    });
    const { result } = renderHook(() => useRegister(), { wrapper });

    act(() => {
      result.current.mutate(dto);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedSetPendingRegistrationContext).toHaveBeenCalledWith({
      email: 'original@empresa.com',
      maskedEmail: 'o***l@empresa.com',
      isNewPreRegistration: false,
    });
    expect(push).toHaveBeenCalledWith('/signup/verify');
  });

  it('en error, muestra un toast y no redirige', async () => {
    mockedRegisterRequest.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useRegister(), { wrapper });

    act(() => {
      result.current.mutate(dto);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toast.error).toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
});
