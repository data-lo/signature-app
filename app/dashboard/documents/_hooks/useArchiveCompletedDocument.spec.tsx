import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import {
  ARCHIVE_FORBIDDEN_MESSAGE,
  ARCHIVE_GENERIC_ERROR_MESSAGE,
  useArchiveCompletedDocument,
} from './useArchiveCompletedDocument';
import { archiveDocumentRequest } from '../_requests';

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

    await waitFor(() =>
      expect(mockedToast.error).toHaveBeenCalledWith(
        ARCHIVE_GENERIC_ERROR_MESSAGE,
      ),
    );
    expect(mockedToast.success).not.toHaveBeenCalled();
    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  /**
   * El 403 lleva un mensaje propio: el del backend sale de la Policy de lectura y habla de
   * "consultar" el documento, que no es lo que la persona intentó.
   */
  it('ante un 403 explica que falta el permiso para archivar', async () => {
    mockedArchiveDocumentRequest.mockRejectedValue(
      axiosErrorWith(403, {
        message: 'No tienes permiso para consultar este documento',
      }),
    );
    const { result } = renderHook(() => useArchiveCompletedDocument(), {
      wrapper,
    });

    result.current.mutate('doc-1');

    await waitFor(() =>
      expect(mockedToast.error).toHaveBeenCalledWith(ARCHIVE_FORBIDDEN_MESSAGE),
    );
  });

  /** Fuera del 403, el mensaje del backend ya se entiende tal cual (p. ej. el de estatus). */
  it('en otros rechazos muestra el mensaje del backend', async () => {
    const backendMessage =
      "El documento no puede archivarse. Solo se permiten documentos con estatus 'SIGNED', el estatus actual es 'PENDING_SIGNATURE'";
    mockedArchiveDocumentRequest.mockRejectedValue(
      axiosErrorWith(400, { message: backendMessage }),
    );
    const { result } = renderHook(() => useArchiveCompletedDocument(), {
      wrapper,
    });

    result.current.mutate('doc-1');

    await waitFor(() =>
      expect(mockedToast.error).toHaveBeenCalledWith(backendMessage),
    );
  });
});
