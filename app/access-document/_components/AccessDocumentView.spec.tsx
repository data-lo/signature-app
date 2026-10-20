import { renderWithProviders, screen, waitFor } from '@/test-utils';
import AccessDocumentView from './AccessDocumentView';
import { getAuthToken } from '@/lib/cookies';
import { getPendingSignatureContext } from '@/lib/pending-signature-context';
import apiClient from '@/lib/axios';
import { AxiosError, type AxiosResponse } from 'axios';
import { getPublicSigningInvitationRequest } from '@/app/(public)/public/documents/[id]/sign/_requests';

jest.mock('@/lib/cookies');
jest.mock('@/app/(public)/public/documents/[id]/sign/_requests', () => ({
  getPublicSigningInvitationRequest: jest.fn(),
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
const mockedGetInvitation = getPublicSigningInvitationRequest as jest.Mock;

const notFound = () =>
  new AxiosError('404', '404', undefined, undefined, {
    status: 404,
    data: {},
  } as AxiosResponse);

describe('AccessDocumentView', () => {
  beforeEach(() => {
    replace.mockReset();
    mockedGetAuthToken.mockReset();
    mockedPatch.mockReset();
    mockedPatch.mockResolvedValue({ data: {} });
    // Por defecto el enlace no es de un firmante (testigo, revisor): el flujo de siempre.
    mockedGetInvitation.mockReset().mockRejectedValue(notFound());
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

  it('si la validación falla por red, cae al /login de siempre', async () => {
    mockedGetAuthToken.mockReturnValue(null);
    mockedGetInvitation.mockRejectedValue(new Error('network'));

    renderWithProviders(
      <AccessDocumentView
        documentId="doc-1"
        collaboratorId="collab-1"
        email="ana@correo.mx"
      />,
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
  });

  describe('invitación de firmante', () => {
    beforeEach(() => {
      mockedGetInvitation.mockResolvedValue({
        documentName: 'contrato.pdf',
        maskedEmail: 'a***@correo.mx',
        signatureType: 'BIOMETRIC',
        availableForSigning: true,
        guestSigningAllowed: true,
      });
    });

    it.each([
      ['sin sesión', null],
      ['con sesión', 'token-1'],
    ])(
      '%s: va a la pantalla pública de firma, que decide; aquí no vincula ni guarda contexto',
      async (_case, token) => {
        mockedGetAuthToken.mockReturnValue(token);

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
        expect(mockedGetInvitation).toHaveBeenCalledWith('doc-1', 'collab-1');
        expect(mockedPatch).not.toHaveBeenCalled();
        expect(getPendingSignatureContext()).toBeNull();
      },
    );
  });
});
