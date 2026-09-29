import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import {
  RESTORE_FORBIDDEN_MESSAGE,
  RESTORE_GENERIC_ERROR_MESSAGE,
  RESTORE_SUCCESS_MESSAGE,
  useRestoreArchivedDocument,
} from './useRestoreArchivedDocument';
import { restoreArchivedDocumentRequest } from '../_requests';

/** Rechazo de axios con el código y el cuerpo que mandaría el backend. */
function axiosErrorWith(status: number, data?: unknown) {
  return new AxiosError('fallo', undefined, undefined, undefined, {
    status,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data,
  } as AxiosResponse);
}

jest.mock('../_requests');
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const mockedRestoreRequest = restoreArchivedDocumentRequest as jest.Mock;
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

describe('useRestoreArchivedDocument', () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    mockedRestoreRequest.mockReset();
    mockedRestoreRequest.mockResolvedValue({
      documentId: 'doc-1',
      archived: false,
    });
    mockedToast.success.mockReset();
    mockedToast.error.mockReset();
  });

  it('recupera el documento que recibe', async () => {
    const { result } = renderHook(() => useRestoreArchivedDocument(), {
      wrapper,
    });

    result.current.mutate('doc-1');

    await waitFor(() =>
      expect(mockedRestoreRequest).toHaveBeenCalledWith('doc-1'),
    );
  });

  /**
   * El documento sale de "Archivados" y vuelve al listado por refetch. Se invalida la clave raíz,
   * literal, porque puede estar cacheado en las dos vistas a la vez (ver `useDocuments`).
   */
  it('invalida todo el listado de documentos y confirma al usuario', async () => {
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useRestoreArchivedDocument(), {
      wrapper,
    });

    result.current.mutate('doc-1');

    await waitFor(() =>
      expect(mockedToast.success).toHaveBeenCalledWith(RESTORE_SUCCESS_MESSAGE),
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['documents'] });
  });

  it('avisa del error y no invalida el listado si la petición falla', async () => {
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    mockedRestoreRequest.mockRejectedValue(new Error('500'));
    const { result } = renderHook(() => useRestoreArchivedDocument(), {
      wrapper,
    });

    result.current.mutate('doc-1');

    await waitFor(() =>
      expect(mockedToast.error).toHaveBeenCalledWith(
        RESTORE_GENERIC_ERROR_MESSAGE,
      ),
    );
    expect(invalidate).not.toHaveBeenCalled();
    expect(mockedToast.success).not.toHaveBeenCalled();
  });

  it('ante un 403 explica que falta el permiso', async () => {
    mockedRestoreRequest.mockRejectedValue(
      axiosErrorWith(403, { message: 'No tienes permiso para consultar' }),
    );
    const { result } = renderHook(() => useRestoreArchivedDocument(), {
      wrapper,
    });

    result.current.mutate('doc-1');

    await waitFor(() =>
      expect(mockedToast.error).toHaveBeenCalledWith(RESTORE_FORBIDDEN_MESSAGE),
    );
  });

  it('en otros rechazos muestra el mensaje del backend', async () => {
    mockedRestoreRequest.mockRejectedValue(
      axiosErrorWith(404, {
        message: 'El documento con id doc-1 no se encuentra',
      }),
    );
    const { result } = renderHook(() => useRestoreArchivedDocument(), {
      wrapper,
    });

    result.current.mutate('doc-1');

    await waitFor(() =>
      expect(mockedToast.error).toHaveBeenCalledWith(
        'El documento con id doc-1 no se encuentra',
      ),
    );
  });
});
