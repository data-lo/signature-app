import { renderWithProviders, screen, waitFor } from '@/test-utils';
import MobileSignatureCaptureView from './MobileSignatureCaptureView';
import { getAuthToken } from '@/lib/cookies';
import {
  claimSignatureCaptureSessionRequest,
  SignatureCaptureChannel,
  SignatureCaptureSessionStatus,
} from '@/lib/api/signature-capture';
import {
  getPendingSignatureCaptureToken,
  setPendingSignatureCaptureToken,
} from '@/lib/pending-signature-capture';

jest.mock('@/lib/cookies', () => ({ getAuthToken: jest.fn() }));
jest.mock('@/lib/api/signature-capture', () => ({
  ...jest.requireActual('@/lib/api/signature-capture'),
  claimSignatureCaptureSessionRequest: jest.fn(),
  saveHandwrittenSignatureRequest: jest.fn(),
}));
jest.mock('@/lib/pending-signature-capture', () => ({
  setPendingSignatureCaptureToken: jest.fn(),
  getPendingSignatureCaptureToken: jest.fn(),
  clearPendingSignatureCaptureToken: jest.fn(),
}));
// El canvas no aporta nada a lo que se prueba aquí y jsdom no lo implementa.
jest.mock('@/components/signature/SignatureDrawer', () => ({
  __esModule: true,
  default: () => <div>canvas de firma</div>,
}));

const mockedGetAuthToken = getAuthToken as jest.Mock;
const mockedClaim = claimSignatureCaptureSessionRequest as jest.Mock;
const mockedSetPending = setPendingSignatureCaptureToken as jest.Mock;
const mockedGetPending = getPendingSignatureCaptureToken as jest.Mock;

let searchParams = new URLSearchParams();
jest.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
}));

function session() {
  return {
    id: 'cap-1',
    channel: SignatureCaptureChannel.MobileQr,
    status: SignatureCaptureSessionStatus.Claimed,
    expiresAt: new Date(Date.now() + 600_000).toISOString(),
    claimedAt: new Date().toISOString(),
    completedAt: null,
    signatureId: null,
    signingCredentialStatus: 'SIGNATURE_PENDING',
  };
}

describe('MobileSignatureCaptureView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    searchParams = new URLSearchParams('token=tok-abc');
    mockedGetPending.mockReturnValue(null);
  });

  it('canjea el token y muestra el canvas cuando hay sesión iniciada', async () => {
    mockedGetAuthToken.mockReturnValue('jwt');
    mockedClaim.mockResolvedValue(session());

    renderWithProviders(<MobileSignatureCaptureView />);

    await waitFor(() => expect(mockedClaim).toHaveBeenCalledWith('tok-abc'));
    expect(await screen.findByText('canvas de firma')).toBeInTheDocument();
  });

  /**
   * El caso que motiva que `/signature-capture` esté en PUBLIC_ROUTES: sin guardar el token antes
   * de ir a /login, el QR —que es de un solo uso— se gastaría sin haberse canjeado.
   */
  it('guarda el token y manda a iniciar sesión si el celular no la tiene', async () => {
    mockedGetAuthToken.mockReturnValue(undefined);

    renderWithProviders(<MobileSignatureCaptureView />);

    await waitFor(() =>
      expect(mockedSetPending).toHaveBeenCalledWith('tok-abc'),
    );
    // La redirección en sí no se asserta: jsdom no permite interceptar `location.href` sin
    // reemplazar el objeto entero. Lo que importa —y lo que se rompería— es que el token quede
    // guardado y que NO se intente canjear sin sesión.
    expect(mockedClaim).not.toHaveBeenCalled();
  });

  it('retoma el token guardado al volver de iniciar sesión', async () => {
    searchParams = new URLSearchParams();
    mockedGetPending.mockReturnValue('tok-guardado');
    mockedGetAuthToken.mockReturnValue('jwt');
    mockedClaim.mockResolvedValue(session());

    renderWithProviders(<MobileSignatureCaptureView />);

    await waitFor(() =>
      expect(mockedClaim).toHaveBeenCalledWith('tok-guardado'),
    );
  });

  /** QR vencido, ya consumido o emitido para otro usuario: el backend los rechaza igual. */
  it('no deja firmar si el código ya no es válido', async () => {
    mockedGetAuthToken.mockReturnValue('jwt');
    mockedClaim.mockRejectedValue(new Error('token inválido'));

    renderWithProviders(<MobileSignatureCaptureView />);

    expect(await screen.findByText(/no se puede firmar aquí/i)).toBeInTheDocument();
    expect(screen.queryByText('canvas de firma')).not.toBeInTheDocument();
  });

  it('avisa si el enlace llega sin código', async () => {
    searchParams = new URLSearchParams();
    mockedGetPending.mockReturnValue(null);
    mockedGetAuthToken.mockReturnValue('jwt');

    renderWithProviders(<MobileSignatureCaptureView />);

    expect(
      await screen.findByText(/no trae un código de firma/i),
    ).toBeInTheDocument();
    expect(mockedClaim).not.toHaveBeenCalled();
  });
});
