import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';
import { useArchiveCompletedDocument } from './useArchiveCompletedDocument';
import { archiveDocumentRequest } from '../_requests';

jest.mock('../_requests');
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const mockedArchiveDocumentRequest = archiveDocumentRequest as jest.Mock;
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

describe('useArchiveCompletedDocument', () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    mockedArchiveDocumentRequest.mockReset();
    mockedArchiveDocumentRequest.mockResolvedValue({
      documentId: 'doc-1',
      archived: true,
      archivedAt: '2026-09-08T00:00:00.000Z',
    });
    mockedToast.success.mockReset();
    mockedToast.error.mockReset();
  });

  it('archiva el documento que recibe', async () => {
    const { result } = renderHook(() => useArchiveCompletedDocument(), {
      wrapper,
    });

    result.current.mutate('doc-1');

    await waitFor(() =>
      expect(mockedArchiveDocumentRequest).toHaveBeenCalledWith('doc-1'),
    );
  });

  /**
   * La fila desaparece por refetch: el backend ya excluye del listado lo que este usuario
   * archivó, así que invalidar trae la lista buena con su paginación recalculada. Se invalida la
   * clave raíz porque el documento puede estar cacheado en varias combinaciones de
   * cuenta/filtros/página a la vez (ver `useDocuments`).
   *
   * La clave se comprueba literal, y no con `expect.anything()`, porque el fallo que esta prueba
   * dejó pasar fue exactamente ése: el hook invalidaba `['myDocuments']` —el nombre anterior a la
   * unificación del listado— y la prueba afirmaba el mismo valor equivocado, así que ninguna de
   * las dos notaba que no se refrescaba nada.
   */
  it('invalida el listado de documentos para que la fila archivada desaparezca', async () => {
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useArchiveCompletedDocument(), {
      wrapper,
    });

    result.current.mutate('doc-1');

    await waitFor(() =>
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['documents'],
      }),
    );
  });

  it('confirma el archivado al usuario', async () => {
    const { result } = renderHook(() => useArchiveCompletedDocument(), {
      wrapper,
    });

    result.current.mutate('doc-1');

    await waitFor(() =>
      expect(mockedToast.success).toHaveBeenCalledWith('Documento archivado'),
    );
    expect(mockedToast.error).not.toHaveBeenCalled();
  });

  it('avisa del error y no invalida el listado si la petición falla', async () => {
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
    mockedArchiveDocumentRequest.mockRejectedValue(new Error('500'));
    const { result } = renderHook(() => useArchiveCompletedDocument(), {
      wrapper,
    });

    result.current.mutate('doc-1');

    await waitFor(() => expect(mockedToast.error).toHaveBeenCalled());
    expect(mockedToast.success).not.toHaveBeenCalled();
    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
