import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useSignDocument } from './useSignDocument';
import { useRejectDocument } from './useRejectDocument';
import { useConfirmCancellation } from './useConfirmCancellation';
import { useDocumentFileUrl } from '../../_hooks/useDocumentFileUrl';
import {
  signDocumentRequest,
  rejectDocumentRequest,
  confirmCancellationRequest,
} from '../_requests';
import { getDocumentFileUrlRequest } from '../../_requests';

jest.mock('../_requests');
jest.mock('../../_requests');
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const push = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

const mockedSignDocumentRequest = signDocumentRequest as jest.Mock;
const mockedRejectDocumentRequest = rejectDocumentRequest as jest.Mock;
const mockedConfirmCancellationRequest = confirmCancellationRequest as jest.Mock;
const mockedGetDocumentFileUrlRequest = getDocumentFileUrlRequest as jest.Mock;

const DOCUMENT_ID = 'doc-1';
const ORIGINAL_URL = 'http://minio/created-documents/doc.pdf?sig=1';
const SIGNED_URL = 'http://minio/signed-documents/doc.pdf?sig=2';

/**
 * Reproduce la configuración real de producción (ver app/providers.tsx): con `staleTime` de 5
 * minutos, una query que no se invalida explícitamente NO se vuelve a pedir al remontar — sigue
 * sirviéndose desde cache. Es justo lo que hacía que, tras firmar, el visor siguiera mostrando
 * la URL prefirmada del bucket `created_documents` (el PDF sin firmar).
 */
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { staleTime: 1000 * 60 * 5, retry: false },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, queryClient };
}

/** Monta el hook del visor y el de la mutación sobre el MISMO cache, como en la pantalla real. */
function renderFileUrlWith<T>(useMutationHook: () => T) {
  const { wrapper } = createWrapper();
  return renderHook(
    () => ({
      fileUrl: useDocumentFileUrl(DOCUMENT_ID),
      mutation: useMutationHook(),
    }),
    { wrapper },
  );
}

describe('invalidación de la URL del archivo al cambiar el estatus del documento', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSignDocumentRequest.mockResolvedValue(undefined);
    mockedRejectDocumentRequest.mockResolvedValue(undefined);
    mockedConfirmCancellationRequest.mockResolvedValue(undefined);
    mockedGetDocumentFileUrlRequest
      .mockResolvedValueOnce({ secureUrl: ORIGINAL_URL, expiresIn: 86400 })
      .mockResolvedValue({ secureUrl: SIGNED_URL, expiresIn: 86400 });
  });

  it('al firmar: vuelve a pedir la URL y deja de servir la versión original desde cache', async () => {
    const { result } = renderFileUrlWith(() => useSignDocument(DOCUMENT_ID));

    await waitFor(() =>
      expect(result.current.fileUrl.data?.secureUrl).toBe(ORIGINAL_URL),
    );

    result.current.mutation.mutate({
      geolocation: { latitude: 19.4326, longitude: -99.1332 },
    });

    // Regresión: sin invalidar ['documentFileUrl', documentId], el staleTime de 5 min mantenía
    // viva la URL del bucket original y el documento firmado se seguía viendo sin firmar.
    await waitFor(() =>
      expect(result.current.fileUrl.data?.secureUrl).toBe(SIGNED_URL),
    );
    expect(mockedGetDocumentFileUrlRequest).toHaveBeenCalledTimes(2);
  });

  it('al rechazar: vuelve a pedir la URL (el documento cambia a rejected_documents)', async () => {
    const { result } = renderFileUrlWith(() => useRejectDocument(DOCUMENT_ID));

    await waitFor(() =>
      expect(result.current.fileUrl.data?.secureUrl).toBe(ORIGINAL_URL),
    );

    result.current.mutation.mutate('no estoy de acuerdo');

    await waitFor(() =>
      expect(result.current.fileUrl.data?.secureUrl).toBe(SIGNED_URL),
    );
  });

  it('al confirmar la cancelación: vuelve a pedir la URL (pasa a cancelled_documents)', async () => {
    const { result } = renderFileUrlWith(() =>
      useConfirmCancellation(DOCUMENT_ID),
    );

    await waitFor(() =>
      expect(result.current.fileUrl.data?.secureUrl).toBe(ORIGINAL_URL),
    );

    result.current.mutation.mutate();

    await waitFor(() =>
      expect(result.current.fileUrl.data?.secureUrl).toBe(SIGNED_URL),
    );
  });
});
