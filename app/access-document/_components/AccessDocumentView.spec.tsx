import { renderWithProviders, screen, waitFor } from '@/test-utils';
import AccessDocumentView from './AccessDocumentView';
import { getAuthToken } from '@/lib/cookies';
import { getPendingSignatureContext } from '@/lib/pending-signature-context';

jest.mock('@/lib/cookies');

const replace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}));

const mockedGetAuthToken = getAuthToken as jest.Mock;

describe('AccessDocumentView', () => {
  beforeEach(() => {
    replace.mockReset();
    mockedGetAuthToken.mockReset();
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

  it('Caso A: con sesión activa, guarda el contexto, redirige al documento y limpia el contexto', async () => {
    mockedGetAuthToken.mockReturnValue('token-1');

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
  });
});
