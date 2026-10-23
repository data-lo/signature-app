import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';
import { useUpdatePersonalInformation } from './useUpdatePersonalInformation';
import { updatePersonalInformationRequest } from '../_requests';

jest.mock('../_requests');
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));
const push = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: push }),
}));

const mockedUpdateRequest = updatePersonalInformationRequest as jest.Mock;
const mockedToast = toast as unknown as {
  success: jest.Mock;
  error: jest.Mock;
};

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const values = { phoneNumber: '5512345678', secondaryEmail: 'otro@correo.com' };

/**
 * Historia "Evitar redirección a Documentos al guardar información personal": guardar deja al
 * usuario en su perfil, con una confirmación o un error claros.
 */
describe('useUpdatePersonalInformation', () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    mockedUpdateRequest.mockReset().mockResolvedValue(undefined);
    mockedToast.success.mockReset();
    mockedToast.error.mockReset();
    push.mockReset();
  });

  it('confirma el guardado y no redirige a Documentos', async () => {
    const { result } = renderHook(() => useUpdatePersonalInformation(), {
      wrapper,
    });

    result.current.mutate(values);

    await waitFor(() =>
      expect(mockedToast.success).toHaveBeenCalledWith(
        'Información de contacto actualizada correctamente',
      ),
    );
    expect(mockedUpdateRequest.mock.calls[0][0]).toEqual(values);
    expect(push).not.toHaveBeenCalled();
  });

  it('recarga el usuario actual para que el formulario muestre lo guardado', async () => {
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useUpdatePersonalInformation(), {
      wrapper,
    });

    result.current.mutate(values);

    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['currentUser'] }),
    );
  });

  it('si falla, muestra el motivo del backend y tampoco navega', async () => {
    mockedUpdateRequest.mockRejectedValue({
      response: { data: { message: 'El teléfono no es válido' } },
    });
    const { result } = renderHook(() => useUpdatePersonalInformation(), {
      wrapper,
    });

    result.current.mutate(values);

    await waitFor(() =>
      expect(mockedToast.error).toHaveBeenCalledWith(
        'El teléfono no es válido',
      ),
    );
    expect(mockedToast.success).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it('sin mensaje del backend, muestra uno genérico', async () => {
    mockedUpdateRequest.mockRejectedValue(new Error('Network Error'));
    const { result } = renderHook(() => useUpdatePersonalInformation(), {
      wrapper,
    });

    result.current.mutate(values);

    await waitFor(() =>
      expect(mockedToast.error).toHaveBeenCalledWith(
        'Ocurrió un error al actualizar tu información de contacto. Intenta de nuevo.',
      ),
    );
  });
});
