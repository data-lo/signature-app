import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useDownloadDocument } from './useDownloadDocument';
import { getDocumentFileUrlRequest } from '../_requests';

jest.mock('../_requests');
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

const mockedGetDocumentFileUrlRequest = getDocumentFileUrlRequest as jest.Mock;

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

/**
 * Historia "Descargar documentos usando el nombre del archivo en lugar del ID".
 *
 * Este hook es el único punto de descarga de documentos de la aplicación: lo consume
 * `DocumentsTable`, que a su vez sirve a las tres secciones del listado y a la del alta. Por eso
 * el criterio "el cambio aplica a todas las tablas" se cubre acá y no tabla por tabla.
 */
describe('useDownloadDocument', () => {
  beforeEach(() => {
    mockedGetDocumentFileUrlRequest.mockReset();
    mockedGetDocumentFileUrlRequest.mockResolvedValue({
      secureUrl: 'https://minio.local/bucket/object-key-1?firma=abc',
    });
  });

  /**
   * El nombre lo resuelve el backend desde `file_name` y viaja firmado dentro de la URL; lo único
   * que le toca al cliente es pedir la variante de descarga.
   */
  it('pide la URL en su variante de descarga', async () => {
    const { result } = renderHook(() => useDownloadDocument(), { wrapper });

    result.current.mutate('doc-1');

    await waitFor(() =>
      expect(mockedGetDocumentFileUrlRequest).toHaveBeenCalledWith('doc-1', {
        download: true,
      }),
    );
  });

  /**
   * Un enlace temporal, no `window.open`: la respuesta viene marcada como descarga, así que el
   * navegador guarda el archivo sin sacar al usuario de la tabla.
   */
  it('dispara la descarga con un enlace y lo retira del DOM', async () => {
    const createElement = jest.spyOn(document, 'createElement');
    const { result } = renderHook(() => useDownloadDocument(), { wrapper });

    result.current.mutate('doc-1');

    await waitFor(() => expect(createElement).toHaveBeenCalledWith('a'));
    const link = createElement.mock.results.at(-1)!.value as HTMLAnchorElement;

    expect(link.href).toBe('https://minio.local/bucket/object-key-1?firma=abc');
    // Sin valor: en una URL de otro origen el navegador ignora el nombre del atributo y usa el
    // del `Content-Disposition`, así que ponerlo acá fingiría que el cliente lo decide.
    expect(link.getAttribute('download')).toBe('');
    // Ya retirado: el enlace es un medio para disparar la bajada, no algo que quede en la página.
    expect(document.body.contains(link)).toBe(false);

    createElement.mockRestore();
  });

  it('avisa al usuario cuando la descarga falla', async () => {
    const toast = (await import('react-hot-toast')).default;
    mockedGetDocumentFileUrlRequest.mockRejectedValue(new Error('sin permiso'));

    const { result } = renderHook(() => useDownloadDocument(), { wrapper });
    result.current.mutate('doc-1');

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });
});
