import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import { renderWithProviders, screen, waitFor } from '@/test-utils';
import { getAuthToken } from '@/lib/cookies';
import { getPublicSigningContext } from '@/lib/public-signing-context';
import { guestAccessStorageKey } from '@/app/(public)/public/documents/[id]/biometric-signature/_hooks/useGuestAccess';
import { ADVANCED_GUEST_ACCESS_PREFIX } from '@/app/(public)/public/documents/[id]/advanced-signature/_hooks/useGuestAdvancedSignature';
import { getGuestAdvancedSigningDocumentRequest } from '@/app/(public)/public/documents/[id]/advanced-signature/_requests';
import type { SigningSessionResponse } from '@/app/(public)/_signing/signing-session';
import { getSigningSessionByTokenRequest } from '../_requests';
import InvitationSigningEntry from './InvitationSigningEntry';

jest.mock('../_requests');
jest.mock('@/app/(public)/public/documents/[id]/biometric-signature/_requests');
jest.mock('@/app/(public)/public/documents/[id]/advanced-signature/_requests');
jest.mock('@/lib/cookies');
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
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: jest.fn() }),
}));

const TOKEN = 'q3VbX7f0_Lr9-ZtKp2NcWm4YhA8sDe1JuGo6BiQk5Rv';
const mockedGetSession = getSigningSessionByTokenRequest as jest.Mock;
const mockedGetAuthToken = getAuthToken as jest.Mock;

function activeSession(
  overrides: Partial<SigningSessionResponse> = {},
  signer: Partial<NonNullable<SigningSessionResponse['signer']>> = {},
): SigningSessionResponse {
  return {
    status: 'ACTIVE',
    document: { id: 'doc-1', name: 'contrato.pdf' },
    signer: {
      collaboratorId: 'c-1',
      maskedEmail: 'a***@empresa.com',
      accountStatus: null,
      guestSigningAllowed: true,
      ...signer,
    },
    signature: {
      type: 'FIEL',
      requiresEmailVerification: true,
      requiresIdentityValidation: false,
    },
    positions: [],
    expiresAt: '2026-11-01T00:00:00.000Z',
    ...overrides,
  };
}

function httpError(status: number): AxiosError {
  return new AxiosError(String(status), String(status), undefined, undefined, {
    status,
    data: {},
  } as AxiosResponse);
}

function renderEntry() {
  return renderWithProviders(<InvitationSigningEntry token={TOKEN} />);
}

describe('InvitationSigningEntry (/sign/:token)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    mockedGetAuthToken.mockReturnValue(undefined);
  });

  it('muestra la carga mientras resuelve el token, y sólo manda el token', async () => {
    mockedGetSession.mockReturnValue(new Promise(() => {}));
    renderEntry();

    expect(screen.getByText(/validando invitación/i)).toBeInTheDocument();
    expect(mockedGetSession).toHaveBeenCalledWith(TOKEN);
  });

  it('ADVANCED sin cuenta: resumen y paso del código, sin pedir inicio de sesión', async () => {
    mockedGetSession.mockResolvedValue(activeSession());
    renderEntry();

    expect(
      await screen.findByText('Vas a firmar: contrato.pdf'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/firma electrónica avanzada sin cuenta/i),
    ).toBeInTheDocument();
    expect(screen.getByText('a***@empresa.com')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /iniciar sesión/i }),
    ).not.toBeInTheDocument();
    // El PDF no se muestra hasta que el backend valida el código.
    expect(screen.queryByText(/^PDF:/)).not.toBeInTheDocument();
  });

  it('ADVANCED con acceso ya validado: abre el documento que entrega el backend', async () => {
    sessionStorage.setItem(
      guestAccessStorageKey('doc-1', ADVANCED_GUEST_ACCESS_PREFIX),
      JSON.stringify({
        accessToken: 'guest-token',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      }),
    );
    (getGuestAdvancedSigningDocumentRequest as jest.Mock).mockResolvedValue({
      documentId: 'doc-1',
      fileName: 'contrato.pdf',
      canSign: true,
      documentHash: 'hash',
      fileUrl: 'https://minio/contrato.pdf',
      expiresIn: 300,
    });
    mockedGetSession.mockResolvedValue(activeSession());
    renderEntry();

    expect(
      await screen.findByText('PDF: https://minio/contrato.pdf'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /firmar con e.firma/i }),
    ).toBeInTheDocument();
  });

  it('BIOMETRIC sin cuenta: monta el flujo biométrico existente', async () => {
    mockedGetSession.mockResolvedValue(
      activeSession({
        signature: {
          type: 'BIOMETRIC',
          requiresEmailVerification: true,
          requiresIdentityValidation: true,
        },
      }),
    );
    renderEntry();

    expect(await screen.findByText(/firma con biometría/i)).toBeInTheDocument();
  });

  it('SIMPLE con cuenta: guarda el contexto y lleva al login que vincula la invitación', async () => {
    mockedGetSession.mockResolvedValue(
      activeSession(
        {
          signature: {
            type: 'SIMPLE',
            requiresEmailVerification: true,
            requiresIdentityValidation: false,
          },
        },
        { accountStatus: 'ACTIVE', guestSigningAllowed: false },
      ),
    );
    renderEntry();

    await userEvent.click(
      await screen.findByRole('button', { name: /iniciar sesión/i }),
    );

    expect(push).toHaveBeenCalledWith('/login');
    expect(getPublicSigningContext()).toEqual(
      expect.objectContaining({
        documentId: 'doc-1',
        invitationReference: 'c-1',
      }),
    );
  });

  it('SIMPLE con sesión abierta: va directo a la pantalla que vincula la cuenta', async () => {
    mockedGetAuthToken.mockReturnValue('jwt');
    mockedGetSession.mockResolvedValue(
      activeSession(
        {
          signature: {
            type: 'SIMPLE',
            requiresEmailVerification: true,
            requiresIdentityValidation: false,
          },
        },
        { accountStatus: 'ACTIVE', guestSigningAllowed: false },
      ),
    );
    renderEntry();

    await userEvent.click(
      await screen.findByRole('button', { name: /continuar con mi cuenta/i }),
    );

    expect(push).toHaveBeenCalledWith('/public/documents/doc-1/sign');
  });

  it('cuenta PROVISIONED: estado controlado, sin login', async () => {
    mockedGetSession.mockResolvedValue(
      activeSession(
        {
          signature: {
            type: 'SIMPLE',
            requiresEmailVerification: true,
            requiresIdentityValidation: false,
          },
        },
        { accountStatus: 'PROVISIONED', guestSigningAllowed: false },
      ),
    );
    renderEntry();

    expect(
      await screen.findByText(/cuenta pendiente de activar/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('tipo de firma no soportado: estado controlado, sin flujo por defecto', async () => {
    mockedGetSession.mockResolvedValue(
      activeSession({
        signature: {
          type: 'NOM151',
          requiresEmailVerification: true,
          requiresIdentityValidation: false,
        },
      }),
    );
    renderEntry();

    expect(
      await screen.findByText(/tipo de firma no disponible/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/código/i)).not.toBeInTheDocument();
  });

  it.each([
    ['EXPIRED', /invitación vencida/i],
    ['REVOKED', /invitación revocada/i],
    ['ALREADY_SIGNED', /firma completada/i],
    ['DOCUMENT_CANCELLED', /documento cancelado/i],
    ['UNAVAILABLE', /documento no disponible para firma/i],
  ] as const)(
    '%s: estado controlado, sin PDF ni datos del documento',
    async (status, title) => {
      mockedGetSession.mockResolvedValue({ status });
      renderEntry();

      expect(await screen.findByText(title)).toBeInTheDocument();
      expect(screen.queryByText(/contrato\.pdf/)).not.toBeInTheDocument();
      expect(screen.queryByText(/^PDF:/)).not.toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    },
  );

  it.each([404, 400])('%s: invitación inválida', async (status) => {
    mockedGetSession.mockRejectedValue(httpError(status));
    renderEntry();

    expect(await screen.findByText(/invitación inválida/i)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('error inesperado: lo dice y permite reintentar', async () => {
    mockedGetSession
      .mockRejectedValueOnce(httpError(500))
      .mockResolvedValueOnce(activeSession());
    renderEntry();

    await userEvent.click(
      await screen.findByRole('button', { name: /reintentar/i }),
    );

    await waitFor(() =>
      expect(
        screen.getByText('Vas a firmar: contrato.pdf'),
      ).toBeInTheDocument(),
    );
    expect(mockedGetSession).toHaveBeenCalledTimes(2);
  });
});
