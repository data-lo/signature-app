import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import { renderWithProviders, screen, waitFor } from '@/test-utils';
import { SignatureType } from '@/lib/enums/document';
import { getAuthToken } from '@/lib/cookies';
import {
  getPublicSigningContext,
  linkInvitationRequest,
  setPublicSigningContext,
} from '@/lib/public-signing-context';
import { guestAccessStorageKey } from '../../biometric-signature/_hooks/useGuestAccess';
import { getPublicSigningInvitationRequest } from '../_requests';
import {
  getGuestBiometricSessionRequest,
  getGuestSigningDocumentRequest,
} from '../../biometric-signature/_requests';
import PublicInvitationEntry, {
  ACCOUNT_MISMATCH_MESSAGE,
} from './PublicInvitationEntry';

jest.mock('../_requests');
jest.mock('../../biometric-signature/_requests');
jest.mock('@/lib/cookies');
jest.mock('@/lib/public-signing-context', () => ({
  ...jest.requireActual('@/lib/public-signing-context'),
  linkInvitationRequest: jest.fn(),
}));
const logoutMutate = jest.fn();
jest.mock('@/lib/hooks/useLogout', () => ({
  useLogout: () => ({ mutate: logoutMutate, isPending: false }),
}));
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () =>
    function PdfStub({ file }: { file: string }) {
      return <div>PDF: {file}</div>;
    },
}));
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));
const push = jest.fn();
const replace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
}));

const mockedGetInvitation = getPublicSigningInvitationRequest as jest.Mock;
const mockedLink = linkInvitationRequest as jest.Mock;
const mockedGetAuthToken = getAuthToken as jest.Mock;

const INVITATION = {
  documentName: 'contrato.pdf',
  maskedEmail: 'a***@empresa.com',
  signatureType: SignatureType.BIOMETRIC,
  availableForSigning: true,
  guestSigningAllowed: true,
};

function httpError(status: number): AxiosError {
  return new AxiosError(String(status), String(status), undefined, undefined, {
    status,
    data: {},
  } as AxiosResponse);
}

function renderEntry(collaboratorId: string | null = 'c-1') {
  return renderWithProviders(
    <PublicInvitationEntry
      documentId="doc-1"
      collaboratorId={collaboratorId}
      email={collaboratorId ? 'ana@empresa.com' : null}
    />,
  );
}

describe('PublicInvitationEntry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    mockedGetAuthToken.mockReturnValue(undefined);
    mockedGetInvitation.mockResolvedValue(INVITATION);
  });

  describe('sin sesión', () => {
    it('valida la invitación y muestra el flujo biométrico sin permitir elegir el tipo de firma', async () => {
      renderEntry();

      expect(
        await screen.findByText('Vas a firmar: contrato.pdf'),
      ).toBeInTheDocument();
      expect(screen.getByText('a***@empresa.com')).toBeInTheDocument();
      expect(
        screen.getByText(/¿ya tienes una cuenta\?/i),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /iniciar sesión/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /firmar sin cuenta/i }),
      ).toBeInTheDocument();
      expect(mockedGetInvitation).toHaveBeenCalledWith('doc-1', 'c-1');
      expect(mockedLink).not.toHaveBeenCalled();
    });

    it('iniciar sesión: guarda sólo documento, referencia y returnTo, y va a /login', async () => {
      const user = userEvent.setup();
      renderEntry();

      await user.click(
        await screen.findByRole('button', { name: /iniciar sesión/i }),
      );

      expect(push).toHaveBeenCalledWith('/login');
      expect(
        JSON.parse(sessionStorage.getItem('public-signing-context')!),
      ).toEqual({
        documentId: 'doc-1',
        invitationReference: 'c-1',
        returnTo: '/public/documents/doc-1/sign',
      });
      expect(sessionStorage.getItem('public-signing-context')).not.toContain(
        'empresa.com',
      );
      expect(mockedLink).not.toHaveBeenCalled();
    });

    it('firmar sin cuenta: no vincula y entra al flujo del tipo del documento', async () => {
      setPublicSigningContext('doc-1', 'c-1');
      const user = userEvent.setup();
      renderEntry();

      await user.click(
        await screen.findByRole('button', { name: /firmar sin cuenta/i }),
      );

      expect(
        await screen.findByText(/firma con biometría/i),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /enviar código/i }),
      ).toBeInTheDocument();
      expect(mockedLink).not.toHaveBeenCalled();
      expect(getPublicSigningContext()).toBeNull();
    });

    it('muestra los requisitos de e.firma cuando el documento exige FIEL', async () => {
      mockedGetInvitation.mockResolvedValue({
        ...INVITATION,
        signatureType: SignatureType.Fiel,
      });
      renderEntry();

      expect(
        await screen.findByText(/firma electrónica avanzada/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/archivos .cer, .key/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /firmar con e.firma/i }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /firmar sin cuenta/i }),
      ).not.toBeInTheDocument();
    });

    it('si la invitación no admite firmar sin cuenta, sólo ofrece iniciar sesión', async () => {
      mockedGetInvitation.mockResolvedValue({
        ...INVITATION,
        signatureType: SignatureType.Simple,
        guestSigningAllowed: false,
      });
      renderEntry();

      expect(
        await screen.findByRole('button', { name: /iniciar sesión/i }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /firmar sin cuenta/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('con sesión', () => {
    beforeEach(() => mockedGetAuthToken.mockReturnValue('session-token'));

    it('correo coincidente: el backend vincula y se abre el dashboard', async () => {
      setPublicSigningContext('doc-1', 'c-1');
      mockedLink.mockResolvedValue({ linked: true, outcome: 'LINKED' });

      renderEntry();

      await waitFor(() =>
        expect(replace).toHaveBeenCalledWith('/dashboard/documents/doc-1'),
      );
      expect(mockedLink).toHaveBeenCalledTimes(1);
      expect(mockedLink).toHaveBeenCalledWith('doc-1', 'c-1');
      expect(getPublicSigningContext()).toBeNull();
    });

    it('cuenta que no corresponde: no redirige y ofrece cambiar de cuenta o continuar sin cuenta', async () => {
      mockedLink.mockResolvedValue({
        linked: false,
        outcome: 'ACCOUNT_MISMATCH',
      });

      renderEntry();

      expect(await screen.findByRole('alert')).toHaveTextContent(
        ACCOUNT_MISMATCH_MESSAGE,
      );
      expect(replace).not.toHaveBeenCalled();
      expect(
        screen.getByRole('button', {
          name: /cerrar sesión y usar otra cuenta/i,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /firmar sin cuenta/i }),
      ).toBeInTheDocument();
    });

    it('cerrar sesión y usar otra cuenta: guarda el contexto y cierra la sesión', async () => {
      mockedLink.mockResolvedValue({
        linked: false,
        outcome: 'ACCOUNT_MISMATCH',
      });
      const user = userEvent.setup();
      renderEntry();

      await user.click(
        await screen.findByRole('button', {
          name: /cerrar sesión y usar otra cuenta/i,
        }),
      );

      expect(logoutMutate).toHaveBeenCalled();
      expect(getPublicSigningContext()).toEqual(
        expect.objectContaining({ invitationReference: 'c-1' }),
      );
    });

    it('si la vinculación falla por conexión, no abre el dashboard y permite reintentar', async () => {
      mockedLink
        .mockRejectedValueOnce(new Error('network'))
        .mockResolvedValueOnce({ linked: true, outcome: 'ALREADY_LINKED' });
      const user = userEvent.setup();
      renderEntry();

      expect(await screen.findByRole('alert')).toHaveTextContent(
        /no pudimos vincular tu cuenta/i,
      );
      expect(replace).not.toHaveBeenCalled();

      await user.click(screen.getByRole('button', { name: /reintentar/i }));
      await waitFor(() =>
        expect(replace).toHaveBeenCalledWith('/dashboard/documents/doc-1'),
      );
    });

    it('de regreso del login (sin query) usa la referencia del contexto temporal', async () => {
      setPublicSigningContext('doc-1', 'c-9');
      mockedLink.mockResolvedValue({
        linked: false,
        outcome: 'ACCOUNT_MISMATCH',
      });

      renderEntry(null);

      expect(await screen.findByRole('alert')).toHaveTextContent(
        ACCOUNT_MISMATCH_MESSAGE,
      );
      expect(mockedGetInvitation).toHaveBeenCalledWith('doc-1', 'c-9');
    });
  });

  it('documento no disponible para firma', async () => {
    mockedGetInvitation.mockResolvedValue({
      ...INVITATION,
      availableForSigning: false,
    });
    mockedGetAuthToken.mockReturnValue('session-token');

    renderEntry();

    expect(
      await screen.findByText(/documento no disponible para firma/i),
    ).toBeInTheDocument();
    expect(mockedLink).not.toHaveBeenCalled();
  });

  it('invitación inválida (404): lo dice y limpia el contexto', async () => {
    setPublicSigningContext('doc-1', 'c-1');
    mockedGetInvitation.mockRejectedValue(httpError(404));

    renderEntry();

    expect(await screen.findByText(/invitación inválida/i)).toBeInTheDocument();
    expect(getPublicSigningContext()).toBeNull();
  });

  it('error de conexión al validar: permite reintentar', async () => {
    mockedGetInvitation
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(INVITATION);
    const user = userEvent.setup();

    renderEntry();

    await user.click(
      await screen.findByRole('button', { name: /reintentar/i }),
    );
    expect(
      await screen.findByText('Vas a firmar: contrato.pdf'),
    ).toBeInTheDocument();
  });

  it('sin invitación ni contexto, pero con acceso biométrico vigente (regreso de Didit), retoma la firma', async () => {
    sessionStorage.setItem(
      guestAccessStorageKey('doc-1'),
      JSON.stringify({
        accessToken: 't-1',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      }),
    );

    (getGuestSigningDocumentRequest as jest.Mock).mockResolvedValue({
      documentId: 'doc-1',
      fileName: 'contrato.pdf',
      canSign: true,
      fileUrl: 'https://minio/doc.pdf',
      expiresIn: 300,
    });
    (getGuestBiometricSessionRequest as jest.Mock).mockResolvedValue(null);

    renderEntry(null);

    expect(
      await screen.findByText('PDF: https://minio/doc.pdf'),
    ).toBeInTheDocument();
    expect(mockedGetInvitation).not.toHaveBeenCalled();
  });

  it('sin invitación, contexto ni acceso: invitación inválida', async () => {
    renderEntry(null);

    expect(await screen.findByText(/invitación inválida/i)).toBeInTheDocument();
    expect(mockedGetInvitation).not.toHaveBeenCalled();
  });
});
