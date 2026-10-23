import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useLogout } from './useLogout';
import { logout } from '../auth';

jest.mock('../auth');

const push = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

describe('useLogout', () => {
  it('descarta del caché las URLs prefirmadas de MinIO y vuelve al login', async () => {
    (logout as jest.Mock).mockResolvedValue(undefined);
    const queryClient = new QueryClient();
    queryClient.setQueryData(['documentFileUrl', 'doc-1', 'account-1'], {
      secureUrl: 'http://minio/doc.pdf?sig=1',
    });
    queryClient.setQueryData(['documents', 'account-1'], []);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useLogout(), { wrapper });
    result.current.mutate();

    await waitFor(() => expect(push).toHaveBeenCalledWith('/login'));
    expect(
      queryClient.getQueryData(['documentFileUrl', 'doc-1', 'account-1']),
    ).toBeUndefined();
    expect(
      queryClient.getQueryCache().findAll({ queryKey: ['documentFileUrl'] }),
    ).toHaveLength(0);
  });
});
