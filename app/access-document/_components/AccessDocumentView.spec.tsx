import { renderWithProviders, screen, waitFor } from '@/test-utils';
import AccessDocumentView from './AccessDocumentView';
import { getAuthToken } from '@/lib/cookies';
import { getPendingSignatureContext } from '@/lib/pending-signature-context';
import apiClient from '@/lib/axios';

jest.mock('@/lib/cookies');
jest.mock('@/lib/axios', () => ({
  __esModule: true,
  default: { patch: jest.fn() },
}));

const replace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}));

const mockedGetAuthToken = getAuthToken as jest.Mock;
const mockedPatch = apiClient.patch as jest.Mock;

describe('AccessDocumentView', () => {
  beforeEach(() => {
    replace.mockReset();
    mockedGetAuthToken.mockReset();
    mockedPatch.mockReset();
    mockedPatch.mockResolvedValue({ data: {} });
    localStorage.clear();
  });

  it('muestra un error si faltan documentId o collaboratorId', () => {
    renderWithProviders(
      <AccessDocumentView
        documentId={null}
        collaboratorId="collab-1"
        email="juan@correo.com"
      />,
    );

    expect(screen.getByText(/enlace inválido/i)).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('bug corregido / Caso A: con sesión activa, vincula la cuenta explícitamente antes de redirigir al documento (ya no depende de que el GET de detalle lo haga como efecto secundario)', async () => {
    mockedGetAuthToken.mockReturnValue('token-1');

    renderWithProviders(
      <AccessDocumentView
        documentId="doc-1"
        collaboratorId="collab-1"
        email="juan@correo.com"
      />,
    );

    await waitFor(() =>
      expect(mockedPatch).toHaveBeenCalledWith(
        '/document/doc-1/link-collaborator',
      ),
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/documents/doc-1'));
    expect(getPendingSignatureContext()).toBeNull();
  });

  it('Caso A: si la vinculación explícita falla, igual redirige al documento (best-effort) y limpia el contexto', async () => {
    mockedGetAuthToken.mockReturnValue('token-1');
    mockedPatch.mockRejectedValue(new Error('network error'));

    renderWithProviders(
      <AccessDocumentView
        documentId="doc-1"
        collaboratorId="collab-1"
        email="juan@correo.com"
      />,
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/documents/doc-1'));
    expect(getPendingSignatureContext()).toBeNull();
  });

  it('Caso C: sin sesión, guarda el contexto y redirige a /login', async () => {
    mockedGetAuthToken.mockReturnValue(undefined);

    renderWithProviders(
      <AccessDocumentView
        documentId="doc-1"
        collaboratorId="collab-1"
        email="juan@correo.com"
      />,
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
    expect(getPendingSignatureContext()).toEqual({
      documentId: 'doc-1',
      collaboratorId: 'collab-1',
      email: 'juan@correo.com',
    });
    expect(mockedPatch).not.toHaveBeenCalled();
  });
});
