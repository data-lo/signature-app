import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';
import { useRegister } from './useRegister';
import { registerRequest, type RegisterRequestValues } from '../_requests';
import { setPendingRegistrationContext } from '@/lib/pending-registration-context';
import { acceptInvitationRequest } from '@/lib/api/organization-invitations';

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
jest.mock('@/lib/api/organization-invitations');
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
const mockedAcceptInvitationRequest = acceptInvitationRequest as jest.Mock;

const REGISTERED = {
  userId: 'user-1',
  email: 'ana@empresa.com',
  maskedEmail: 'a***a@empresa.com',
  isNewPreRegistration: true,
};

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
    mockedAcceptInvitationRequest.mockReset();
    (toast.error as jest.Mock).mockReset();
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

  /**
   * Historia "Unificar invitaciones de miembros y vincular cuentas nuevas por token": la
   * invitación se acepta DESPUÉS de que el registro responde bien, y nunca dentro de él.
   */
  describe('registro desde una invitación', () => {
    it('acepta la invitación con el RFC registrado, después del registro y antes de ir al OTP', async () => {
      mockedRegisterRequest.mockResolvedValue(REGISTERED);
      mockedAcceptInvitationRequest.mockResolvedValue(undefined);
      const { result } = renderHook(() => useRegister(), { wrapper });

      act(() => {
        result.current.mutate({ ...dto, invitationToken: 'invite-token-1' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockedAcceptInvitationRequest).toHaveBeenCalledWith(
        'invite-token-1',
        'GOMA900101ABC',
      );
      expect(
        mockedRegisterRequest.mock.invocationCallOrder[0],
      ).toBeLessThan(mockedAcceptInvitationRequest.mock.invocationCallOrder[0]);
      expect(
        mockedAcceptInvitationRequest.mock.invocationCallOrder[0],
      ).toBeLessThan(push.mock.invocationCallOrder[0]);
      expect(push).toHaveBeenCalledWith('/signup/verify');
    });

    it('no intenta aceptar nada cuando el registro no viene de una invitación', async () => {
      mockedRegisterRequest.mockResolvedValue(REGISTERED);
      const { result } = renderHook(() => useRegister(), { wrapper });

      act(() => {
        result.current.mutate(dto);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockedAcceptInvitationRequest).not.toHaveBeenCalled();
    });

    it('no acepta la invitación si el registro falla', async () => {
      mockedRegisterRequest.mockRejectedValue(new Error('network'));
      const { result } = renderHook(() => useRegister(), { wrapper });

      act(() => {
        result.current.mutate({ ...dto, invitationToken: 'invite-token-1' });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(mockedAcceptInvitationRequest).not.toHaveBeenCalled();
    });

    /**
     * La cuenta ya existe: un fallo al aceptar no la revierte ni detiene el registro. Se avisa y
     * se sigue al OTP; la persona podrá aceptar una invitación nueva con el RFC que ya registró.
     */
    it('si aceptar falla, avisa y continúa al OTP sin tocar la cuenta', async () => {
      mockedRegisterRequest.mockResolvedValue(REGISTERED);
      mockedAcceptInvitationRequest.mockRejectedValue(
        new Error('Esta invitación ya expiró'),
      );
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const { result } = renderHook(() => useRegister(), { wrapper });

      act(() => {
        result.current.mutate({ ...dto, invitationToken: 'invite-token-1' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/tu cuenta se creó/i),
      );
      expect(mockedRegisterRequest).toHaveBeenCalledTimes(1);
      expect(mockedSetPendingRegistrationContext).toHaveBeenCalled();
      expect(push).toHaveBeenCalledWith('/signup/verify');
    });
  });
});
