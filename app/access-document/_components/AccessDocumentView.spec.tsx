import { renderWithProviders, screen, waitFor } from '@/test-utils';
import AccessDocumentView from './AccessDocumentView';
import { getAuthToken } from '@/lib/cookies';
import { getPendingSignatureContext } from '@/lib/pending-signature-context';
import apiClient from '@/lib/axios';
import { SignatureType } from '@/lib/enums/document';
import { getPublicSigningMethodRequest } from '@/app/(public)/public/documents/[id]/sign/_requests';

jest.mock('@/lib/cookies');
jest.mock('@/app/(public)/public/documents/[id]/sign/_requests', () => ({
  getPublicSigningMethodRequest: jest.fn(),
}));
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
const mockedGetSigningMethod = getPublicSigningMethodRequest as jest.Mock;

describe('AccessDocumentView', () => {
  beforeEach(() => {
    replace.mockReset();
    mockedGetAuthToken.mockReset();
    mockedPatch.mockReset();
    mockedPatch.mockResolvedValue({ data: {} });
    // Por defecto la invitación no se firma en la pantalla pública: el flujo de siempre.
    mockedGetSigningMethod.mockReset().mockResolvedValue(null);
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
        '/api/v1/document/doc-1/link-collaborator',
      ),
    );
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith('/dashboard/documents/doc-1'),
    );
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

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith('/dashboard/documents/doc-1'),
    );
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

  it('sin sesión y con invitación FIEL sin cuenta, va a la MISMA pantalla pública de firma', async () => {
    mockedGetAuthToken.mockReturnValue(null);
    mockedGetSigningMethod.mockResolvedValue(SignatureType.Fiel);

    renderWithProviders(
      <AccessDocumentView
        documentId="doc-1"
        collaboratorId="collab-1"
        email="ana@correo.mx"
      />,
    );

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        '/public/documents/doc-1/sign?collabId=collab-1&email=ana%40correo.mx',
      ),
    );
  });

  describe('firma biométrica sin cuenta', () => {
    it('sin sesión y con invitación de invitado biométrico, va a la firma pública sin pasar por /login', async () => {
      mockedGetAuthToken.mockReturnValue(null);
      mockedGetSigningMethod.mockResolvedValue(SignatureType.BIOMETRIC);

      renderWithProviders(
        <AccessDocumentView
          documentId="doc-1"
          collaboratorId="collab-1"
          email="ana@correo.mx"
        />,
      );

      await waitFor(() =>
        expect(replace).toHaveBeenCalledWith(
          '/public/documents/doc-1/sign?collabId=collab-1&email=ana%40correo.mx',
        ),
      );
      expect(mockedGetSigningMethod).toHaveBeenCalledWith('doc-1', {
        collaboratorId: 'collab-1',
        email: 'ana@correo.mx',
      });
      expect(replace).not.toHaveBeenCalledWith('/login');
      expect(getPendingSignatureContext()).toBeNull();
    });

    it('si la consulta falla, cae al /login de siempre', async () => {
      mockedGetAuthToken.mockReturnValue(null);
      mockedGetSigningMethod.mockRejectedValue(new Error('network'));

      renderWithProviders(
        <AccessDocumentView
          documentId="doc-1"
          collaboratorId="collab-1"
          email="ana@correo.mx"
        />,
      );

      await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
    });

    it('con sesión no consulta nada: vincula la cuenta como siempre', async () => {
      mockedGetAuthToken.mockReturnValue('token-1');

      renderWithProviders(
        <AccessDocumentView
          documentId="doc-1"
          collaboratorId="collab-1"
          email="ana@correo.mx"
        />,
      );

      await waitFor(() =>
        expect(replace).toHaveBeenCalledWith('/dashboard/documents/doc-1'),
      );
      expect(mockedGetSigningMethod).not.toHaveBeenCalled();
    });
  });
});
