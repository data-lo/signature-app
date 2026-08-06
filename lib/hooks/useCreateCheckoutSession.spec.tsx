import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';
import { useCreateCheckoutSession } from './useCreateCheckoutSession';
import { createCheckoutSessionRequest } from '@/lib/api/plans/plans.requests';

jest.mock('@/lib/api/plans/plans.requests');
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const mockedCreateCheckoutSessionRequest =
  createCheckoutSessionRequest as jest.Mock;

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useCreateCheckoutSession', () => {
  beforeEach(() => {
    mockedCreateCheckoutSessionRequest.mockReset();
    (toast.error as jest.Mock).mockReset();
  });

  it('al éxito: pide la sesión de Checkout con el plan elegido', async () => {
    mockedCreateCheckoutSessionRequest.mockResolvedValue({
      sessionId: 'cs_test_123',
      url: 'https://checkout.stripe.com/cs_test_123',
    });
    const { result } = renderHook(() => useCreateCheckoutSession(), {
      wrapper,
    });

    act(() => {
      result.current.mutate('pro');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedCreateCheckoutSessionRequest).toHaveBeenCalledWith(
      'pro',
      expect.anything(),
    );
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('al fallar: muestra el mensaje de error del backend en vez de fallar en silencio', async () => {
    mockedCreateCheckoutSessionRequest.mockRejectedValue({
      response: { data: { message: 'No se pudo crear el customer de Stripe' } },
    });
    const { result } = renderHook(() => useCreateCheckoutSession(), {
      wrapper,
    });

    act(() => {
      result.current.mutate('pro');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toast.error).toHaveBeenCalledWith(
      'No se pudo crear el customer de Stripe',
    );
  });

  it('al fallar sin mensaje del backend: muestra el mensaje genérico', async () => {
    mockedCreateCheckoutSessionRequest.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useCreateCheckoutSession(), {
      wrapper,
    });

    act(() => {
      result.current.mutate('basic');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toast.error).toHaveBeenCalledWith(
      'No se pudo iniciar el proceso de pago. Intenta de nuevo.',
    );
  });
});
