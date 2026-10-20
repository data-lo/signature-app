import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test-utils';
import { SignatureType } from '@/lib/enums/document';
import { getPendingSignatureContext } from '@/lib/pending-signature-context';
import { getPublicSigningMethodRequest } from '../_requests';
import { guestAccessStorageKey } from '../../biometric-signature/_hooks/useGuestAccess';
import {
  getGuestBiometricSessionRequest,
  getGuestSigningDocumentRequest,
} from '../../biometric-signature/_requests';
import PublicSigningMethodRouter from './PublicSigningMethodRouter';

jest.mock('../_requests');
jest.mock('../../biometric-signature/_requests');
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

const INVITATION = { collaboratorId: 'c-1', email: 'ana@correo.mx' };
const mockedGetSigningMethod = getPublicSigningMethodRequest as jest.Mock;

describe('PublicSigningMethodRouter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  it('documento biométrico: monta el flujo biométrico (código al correo) sin ofrecer elegir tipo', async () => {
    mockedGetSigningMethod.mockResolvedValue(SignatureType.BIOMETRIC);

    renderWithProviders(
      <PublicSigningMethodRouter documentId="doc-1" invitation={INVITATION} />,
    );

    expect(await screen.findByText(/firma con biometría/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /enviar código/i }),
    ).toBeInTheDocument();
    expect(mockedGetSigningMethod).toHaveBeenCalledWith('doc-1', INVITATION);
    expect(
      screen.queryByText(/firma electrónica avanzada/i),
    ).not.toBeInTheDocument();
  });

  it('documento FIEL: entra a la misma pantalla con el flujo de Firma Avanzada', async () => {
    mockedGetSigningMethod.mockResolvedValue(SignatureType.Fiel);
    const user = userEvent.setup();

    renderWithProviders(
      <PublicSigningMethodRouter documentId="doc-1" invitation={INVITATION} />,
    );

    expect(
      await screen.findByText(/firma electrónica avanzada/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/biometría/i)).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /continuar para firmar/i }),
    );
    expect(push).toHaveBeenCalledWith('/login');
    expect(getPendingSignatureContext()).toEqual({
      documentId: 'doc-1',
      ...INVITATION,
    });
  });

  it('una invitación que no se firma aquí ofrece iniciar sesión', async () => {
    mockedGetSigningMethod.mockResolvedValue(null);

    renderWithProviders(
      <PublicSigningMethodRouter documentId="doc-1" invitation={INVITATION} />,
    );

    expect(
      await screen.findByRole('button', { name: /iniciar sesión/i }),
    ).toBeInTheDocument();
  });

  it('si no se puede resolver el tipo, no monta ningún flujo y permite reintentar', async () => {
    mockedGetSigningMethod.mockRejectedValueOnce(new Error('network'));
    mockedGetSigningMethod.mockResolvedValueOnce(SignatureType.BIOMETRIC);
    const user = userEvent.setup();

    renderWithProviders(
      <PublicSigningMethodRouter documentId="doc-1" invitation={INVITATION} />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /no pudimos verificar tu invitación/i,
    );
    await user.click(screen.getByRole('button', { name: /reintentar/i }));
    expect(await screen.findByText(/firma con biometría/i)).toBeInTheDocument();
  });

  it('de regreso de Didit (sin invitación en la URL) retoma la firma biométrica con el acceso de la pestaña', async () => {
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

    renderWithProviders(
      <PublicSigningMethodRouter documentId="doc-1" invitation={null} />,
    );

    expect(
      await screen.findByText('PDF: https://minio/doc.pdf'),
    ).toBeInTheDocument();
    expect(mockedGetSigningMethod).not.toHaveBeenCalled();
  });

  it('sin invitación ni acceso vigente, el enlace es inválido', async () => {
    renderWithProviders(
      <PublicSigningMethodRouter documentId="doc-1" invitation={null} />,
    );

    expect(await screen.findByText(/enlace inválido/i)).toBeInTheDocument();
    expect(mockedGetSigningMethod).not.toHaveBeenCalled();
  });
});
