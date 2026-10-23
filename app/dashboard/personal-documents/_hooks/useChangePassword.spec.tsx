import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';
import { useChangePassword } from './useChangePassword';
import { changePasswordRequest } from '../_requests';

jest.mock('../_requests');
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const mockedChangePasswordRequest = changePasswordRequest as jest.Mock;
const mockedToast = toast as unknown as {
  success: jest.Mock;
  error: jest.Mock;
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const values = {
  currentPassword: 'contrasenaActual',
  newPassword: 'contrasenaNueva',
  confirmPassword: 'contrasenaNueva',
};

describe('useChangePassword', () => {
  beforeEach(() => {
    mockedChangePasswordRequest.mockReset().mockResolvedValue(undefined);
    mockedToast.success.mockReset();
    mockedToast.error.mockReset();
  });

  /** Criterio "al guardar correctamente se muestra una confirmación". */
  it('confirma el cambio al usuario cuando el backend lo acepta', async () => {
    const { result } = renderHook(() => useChangePassword(), { wrapper });

    result.current.mutate(values);

    await waitFor(() =>
      expect(mockedToast.success).toHaveBeenCalledWith(
        'Contraseña actualizada correctamente',
      ),
    );
    // react-query v5 llama al `mutationFn` con (variables, context): sólo el primero es nuestro.
    expect(mockedChangePasswordRequest.mock.calls[0][0]).toEqual(values);
  });

  it('muestra el motivo que devuelve el backend si el cambio se rechaza', async () => {
    mockedChangePasswordRequest.mockRejectedValue({
      response: { data: { message: 'La contraseña actual no es correcta' } },
    });
    const { result } = renderHook(() => useChangePassword(), { wrapper });

    result.current.mutate(values);

    await waitFor(() =>
      expect(mockedToast.error).toHaveBeenCalledWith(
        'La contraseña actual no es correcta',
      ),
    );
    expect(mockedToast.success).not.toHaveBeenCalled();
  });
});
