import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  FILE_URL_RENEWAL_MARGIN_MS,
  getFileUrlFreshnessMs,
  getFileUrlRenewalIntervalMs,
  useDocumentFileUrl,
  type DocumentFileUrlEntry,
} from './useDocumentFileUrl';
import { getDocumentFileUrlRequest } from '../_requests';
import { useAuthStore } from '@/lib/store/useAuthStore';

jest.mock('../_requests');

const mockedGetDocumentFileUrlRequest = getDocumentFileUrlRequest as jest.Mock;

const DOCUMENT_ID = 'doc-1';
const DAY_IN_SECONDS = 24 * 60 * 60;
const T0 = new Date('2026-10-02T12:00:00Z').getTime();

function setActiveAccount(id: string) {
  useAuthStore.setState({
    activeAccount: {
      id,
      accountType: 'PERSONAL',
      organizationId: null,
      roleId: null,
    },
  });
}

/**
 * Misma configuración global que producción (ver app/providers.tsx): el hook tiene que imponer
 * su propia vigencia por encima del `staleTime` de 5 minutos y del foco deshabilitado.
 */
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        staleTime: 1000 * 60 * 5,
        retry: false,
      },
    },
  });
}

function renderFileUrl(queryClient: QueryClient) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useDocumentFileUrl(DOCUMENT_ID), { wrapper });
}

describe('useDocumentFileUrl', () => {
  let now: number;

  beforeEach(() => {
    now = T0;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    setActiveAccount('account-1');
    mockedGetDocumentFileUrlRequest.mockReset();
    let call = 0;
    mockedGetDocumentFileUrlRequest.mockImplementation(async () => {
      call += 1;
      return {
        fileId: 'file-1',
        secureUrl: `http://minio/doc.pdf?sig=${call}`,
        expiresIn: DAY_IN_SECONDS,
      };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('guarda el vencimiento absoluto a partir de expiresIn', async () => {
    const { result } = renderFileUrl(createQueryClient());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.expiresAt).toBe(T0 + DAY_IN_SECONDS * 1000);
  });

  it('al volver a abrir el documento con la URL vigente NO la vuelve a pedir', async () => {
    const queryClient = createQueryClient();
    const first = renderFileUrl(queryClient);
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    first.unmount();

    // Mucho más que los 5 minutos del staleTime global, pero dentro de la vigencia de la URL.
    now = T0 + 6 * 60 * 60 * 1000;
    const second = renderFileUrl(queryClient);

    expect(second.result.current.data?.secureUrl).toBe(
      'http://minio/doc.pdf?sig=1',
    );
    expect(second.result.current.isStale).toBe(false);
    expect(second.result.current.isFetching).toBe(false);
    expect(mockedGetDocumentFileUrlRequest).toHaveBeenCalledTimes(1);
  });

  it('al reabrir dentro del margen de 5 minutos antes de vencer, pide una URL nueva', async () => {
    const queryClient = createQueryClient();
    const first = renderFileUrl(queryClient);
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    first.unmount();

    now = T0 + DAY_IN_SECONDS * 1000 - FILE_URL_RENEWAL_MARGIN_MS + 1;
    const second = renderFileUrl(queryClient);

    await waitFor(() =>
      expect(second.result.current.data?.secureUrl).toBe(
        'http://minio/doc.pdf?sig=2',
      ),
    );
    expect(mockedGetDocumentFileUrlRequest).toHaveBeenCalledTimes(2);
  });

  it('refetch() renueva la URL aunque la vigente no haya vencido (reintento del visor)', async () => {
    const { result } = renderFileUrl(createQueryClient());
    // Se lee `data` como lo hace el visor: React Query sólo re-renderiza por las propiedades que
    // el consumidor ya leyó.
    await waitFor(() =>
      expect(result.current.data?.secureUrl).toBe('http://minio/doc.pdf?sig=1'),
    );

    // El visor reintenta un rato después de haber recibido la URL.
    now = T0 + 60 * 1000;
    await result.current.refetch();

    await waitFor(() =>
      expect(result.current.data?.secureUrl).toBe('http://minio/doc.pdf?sig=2'),
    );
  });

  it('la URL de una cuenta no se reutiliza para otra', async () => {
    const queryClient = createQueryClient();
    const first = renderFileUrl(queryClient);
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    first.unmount();

    setActiveAccount('account-2');
    const second = renderFileUrl(queryClient);

    await waitFor(() =>
      expect(second.result.current.data?.secureUrl).toBe(
        'http://minio/doc.pdf?sig=2',
      ),
    );
    expect(mockedGetDocumentFileUrlRequest).toHaveBeenCalledTimes(2);
  });

  it('no persiste la URL fuera de la memoria', async () => {
    const { result } = renderFileUrl(createQueryClient());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const stored = JSON.stringify({ ...localStorage }) + document.cookie;
    expect(stored).not.toContain('minio');
  });
});

describe('vigencia de la URL del archivo', () => {
  const entry: DocumentFileUrlEntry = {
    fileId: 'file-1',
    secureUrl: 'http://minio/doc.pdf?sig=1',
    expiresIn: DAY_IN_SECONDS,
    expiresAt: T0 + DAY_IN_SECONDS * 1000,
  };

  it('se reutiliza hasta 5 minutos antes de vencer', () => {
    expect(getFileUrlFreshnessMs(entry, T0)).toBe(
      DAY_IN_SECONDS * 1000 - FILE_URL_RENEWAL_MARGIN_MS,
    );
    expect(
      getFileUrlFreshnessMs(
        entry,
        entry.expiresAt - FILE_URL_RENEWAL_MARGIN_MS,
      ),
    ).toBe(0);
    expect(getFileUrlFreshnessMs(entry, entry.expiresAt + 1)).toBe(0);
    expect(getFileUrlFreshnessMs(undefined, T0)).toBe(0);
  });

  it('con el visor abierto programa la renovación al entrar en el margen', () => {
    jest.spyOn(Date, 'now').mockReturnValue(T0);
    expect(getFileUrlRenewalIntervalMs(entry, false)).toBe(
      DAY_IN_SECONDS * 1000 - FILE_URL_RENEWAL_MARGIN_MS,
    );
    jest.restoreAllMocks();
  });

  it('no programa renovaciones sin URL, tras un fallo o con una vigencia menor que el margen', () => {
    expect(getFileUrlRenewalIntervalMs(undefined, false)).toBe(false);
    expect(getFileUrlRenewalIntervalMs(entry, true)).toBe(false);
    expect(
      getFileUrlRenewalIntervalMs(
        { ...entry, expiresIn: 60, expiresAt: T0 + 60_000 },
        false,
      ),
    ).toBe(false);
  });
});
