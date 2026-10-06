import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import { renderWithProviders, screen, waitFor } from '@/test-utils';
import {
  BiometricSignatureStatus,
  DocumentStatus,
  ParticipantStatus,
} from '@/lib/enums/document';
import {
  getGuestBiometricSessionRequest,
  getGuestSigningDocumentRequest,
  requestGuestAccessCodeRequest,
  startGuestBiometricSessionRequest,
  verifyGuestAccessCodeRequest,
} from '../_requests';
import { guestAccessStorageKey } from '../_hooks/useGuestAccess';
import GuestBiometricSignatureView from './GuestBiometricSignatureView';
import { maskEmail } from './GuestAccessCodeStep';

jest.mock('../_requests');
// react-pdf no corre en jsdom: el visor dinámico se sustituye por un marcador con la URL.
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

const INVITATION = { collaboratorId: 'c-1', email: 'ana@correo.mx' };
const FUTURE = new Date(Date.now() + 10 * 60 * 1000).toISOString();

const mockedRequestCode = requestGuestAccessCodeRequest as jest.Mock;
const mockedVerifyCode = verifyGuestAccessCodeRequest as jest.Mock;
const mockedGetDocument = getGuestSigningDocumentRequest as jest.Mock;
const mockedGetSession = getGuestBiometricSessionRequest as jest.Mock;
const mockedStart = startGuestBiometricSessionRequest as jest.Mock;

function unauthorized(): AxiosError {
  return new AxiosError('401', '401', undefined, undefined, {
    status: 401,
    data: {},
  } as AxiosResponse);
}

function mockGeolocation() {
  Object.defineProperty(global.navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: jest.fn((success: PositionCallback) =>
        success({
          coords: { latitude: 19.43, longitude: -99.13, accuracy: 10 },
        } as GeolocationPosition),
      ),
    },
  });
}

describe('GuestBiometricSignatureView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    mockGeolocation();
    mockedRequestCode.mockResolvedValue({ emailDelivered: true });
    mockedVerifyCode.mockResolvedValue({
      accessToken: 't-1',
      expiresAt: FUTURE,
    });
    mockedGetDocument.mockResolvedValue({
      documentId: 'doc-1',
      fileName: 'contrato.pdf',
      documentStatus: DocumentStatus.PendingSignature,
      signerStatus: ParticipantStatus.Pending,
      canSign: true,
      fileUrl: 'https://minio/doc.pdf',
      expiresIn: 86400,
    });
    mockedGetSession.mockResolvedValue(null);
    mockedStart.mockResolvedValue({
      attemptId: 'a-1',
      status: BiometricSignatureStatus.Pending,
      url: 'https://verify.didit.me/s/1',
      expiresAt: null,
      reused: false,
      signatureCompleted: false,
      documentCompleted: false,
    });
  });

  it('pide validar el correo antes de mostrar nada del documento, sin pedir cuenta', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <GuestBiometricSignatureView
        documentId="doc-1"
        invitation={INVITATION}
      />,
    );

    expect(await screen.findByText(/a•••@correo\.mx/)).toBeInTheDocument();
    expect(
      screen.queryByText(/iniciar sesión|regístrate/i),
    ).not.toBeInTheDocument();
    expect(mockedGetDocument).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /enviar código/i }));
    await user.type(
      await screen.findByRole('textbox', { name: /código de verificación/i }),
      '123456',
    );
    await user.click(screen.getByRole('button', { name: /verificar código/i }));

    expect(mockedVerifyCode).toHaveBeenCalledWith(
      'doc-1',
      INVITATION,
      '123456',
    );
    expect(await screen.findByText('contrato.pdf')).toBeInTheDocument();
    expect(screen.getByText('PDF: https://minio/doc.pdf')).toBeInTheDocument();
    expect(mockedGetDocument).toHaveBeenCalledWith('doc-1', 't-1');
  });

  it('con acceso guardado, inicia Didit con consentimiento y ubicación y muestra el QR', async () => {
    sessionStorage.setItem(
      guestAccessStorageKey('doc-1'),
      JSON.stringify({ accessToken: 't-1', expiresAt: FUTURE }),
    );
    const user = userEvent.setup();
    renderWithProviders(
      <GuestBiometricSignatureView documentId="doc-1" invitation={null} />,
    );

    await user.click(await screen.findByRole('checkbox', { name: /acepto/i }));
    await user.click(
      screen.getByRole('button', { name: /firmar con biometría/i }),
    );

    await waitFor(() =>
      expect(mockedStart).toHaveBeenCalledWith('doc-1', 't-1', {
        latitude: 19.43,
        longitude: -99.13,
        accuracy: 10,
      }),
    );
    expect(
      await screen.findByLabelText(/código qr para continuar la verificación/i),
    ).toBeInTheDocument();
  });

  it('un acceso vencido (401) vuelve a pedir el código, no manda a /login', async () => {
    sessionStorage.setItem(
      guestAccessStorageKey('doc-1'),
      JSON.stringify({ accessToken: 't-viejo', expiresAt: FUTURE }),
    );
    mockedGetDocument.mockRejectedValue(unauthorized());
    mockedGetSession.mockRejectedValue(unauthorized());

    renderWithProviders(
      <GuestBiometricSignatureView
        documentId="doc-1"
        invitation={INVITATION}
      />,
    );

    expect(await screen.findByText(/tu acceso venció/i)).toBeInTheDocument();
    expect(sessionStorage.getItem(guestAccessStorageKey('doc-1'))).toBeNull();
  });

  it('firmada: lo confirma y dice si el documento quedó completo', async () => {
    sessionStorage.setItem(
      guestAccessStorageKey('doc-1'),
      JSON.stringify({ accessToken: 't-1', expiresAt: FUTURE }),
    );
    mockedGetDocument.mockResolvedValue({
      documentId: 'doc-1',
      fileName: 'contrato.pdf',
      documentStatus: DocumentStatus.Signed,
      signerStatus: ParticipantStatus.Signed,
      canSign: false,
      fileUrl: 'https://minio/doc.pdf',
      expiresIn: 86400,
    });
    mockedGetSession.mockResolvedValue({
      attemptId: 'a-1',
      status: BiometricSignatureStatus.Approved,
      url: null,
      expiresAt: null,
      reused: true,
      signatureCompleted: true,
      documentCompleted: true,
    });

    renderWithProviders(
      <GuestBiometricSignatureView documentId="doc-1" invitation={null} />,
    );

    expect(await screen.findByText(/quedó registrada/i)).toBeInTheDocument();
    expect(screen.getByText(/firmado por todos/i)).toBeInTheDocument();
  });

  it('sin invitación ni acceso guardado, explica cómo volver', async () => {
    renderWithProviders(
      <GuestBiometricSignatureView documentId="doc-1" invitation={null} />,
    );

    expect(await screen.findByText(/enlace inválido/i)).toBeInTheDocument();
  });
});

describe('maskEmail', () => {
  it('deja la primera letra y el dominio', () => {
    expect(maskEmail('ana.lopez@correo.mx')).toBe('a•••@correo.mx');
  });
});
