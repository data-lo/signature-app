import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import { renderWithProviders, screen, waitFor } from '@/test-utils';
import { DocumentStatus, ParticipantStatus } from '@/lib/enums/document';
import { getAuthToken } from '@/lib/cookies';
import { getPendingSignatureContext } from '@/lib/pending-signature-context';
import apiClient from '@/lib/axios';
import {
  getGuestAdvancedSigningDocumentRequest,
  requestGuestAdvancedAccessCodeRequest,
  signGuestAdvancedDocumentRequest,
  verifyGuestAdvancedAccessCodeRequest,
} from '../_requests';
import { guestAccessStorageKey } from '../../biometric-signature/_hooks/useGuestAccess';
import { ADVANCED_GUEST_ACCESS_PREFIX } from '../_hooks/useGuestAdvancedSignature';
import GuestAdvancedSignatureView from './GuestAdvancedSignatureView';

jest.mock('../_requests');
jest.mock('@/lib/cookies');
jest.mock('@/lib/axios', () => ({
  __esModule: true,
  default: { patch: jest.fn() },
}));
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
// FilePond no corre en jsdom: cada selector se sustituye por un botón que entrega un archivo.
jest.mock(
  '@/app/dashboard/documents/[documentId]/_components/EfirmaFilePicker',
  () => ({
    __esModule: true,
    default: ({
      extension,
      onFileSelected,
    }: {
      extension: string;
      onFileSelected: (file: File | null) => void;
    }) => (
      <button
        type="button"
        onClick={() => onFileSelected(new File(['x'], `archivo.${extension}`))}
      >
        {`Seleccionar .${extension}`}
      </button>
    ),
  }),
);

const push = jest.fn();
const replace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
}));

const INVITATION = { collaboratorId: 'c-1', email: 'ana@correo.mx' };
const FUTURE = new Date(Date.now() + 10 * 60 * 1000).toISOString();
const HASH = 'f'.repeat(64);
const STORAGE_KEY = guestAccessStorageKey(
  'doc-1',
  ADVANCED_GUEST_ACCESS_PREFIX,
);

const mockedRequestCode = requestGuestAdvancedAccessCodeRequest as jest.Mock;
const mockedVerifyCode = verifyGuestAdvancedAccessCodeRequest as jest.Mock;
const mockedGetDocument = getGuestAdvancedSigningDocumentRequest as jest.Mock;
const mockedSign = signGuestAdvancedDocumentRequest as jest.Mock;
const mockedGetAuthToken = getAuthToken as jest.Mock;
const mockedPatch = apiClient.patch as jest.Mock;

function httpError(status: number): AxiosError {
  return new AxiosError(String(status), String(status), undefined, undefined, {
    status,
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

function storeAccess() {
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ accessToken: 't-1', expiresAt: FUTURE }),
  );
}

describe('GuestAdvancedSignatureView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    mockGeolocation();
    mockedGetAuthToken.mockReturnValue(undefined);
    mockedPatch.mockResolvedValue({ data: {} });
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
      documentHash: HASH,
      fileUrl: 'https://minio/doc.pdf',
      expiresIn: 86400,
    });
    mockedSign.mockResolvedValue({ documentCompleted: true });
  });

  it('ofrece firmar con cuenta o sin cuenta', () => {
    renderWithProviders(
      <GuestAdvancedSignatureView documentId="doc-1" invitation={INVITATION} />,
    );

    expect(
      screen.getByRole('button', { name: /tengo una cuenta/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /firmar sin cuenta/i }),
    ).toBeInTheDocument();
  });

  it('sin cuenta: valida el código del correo y muestra el documento a firmar', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <GuestAdvancedSignatureView documentId="doc-1" invitation={INVITATION} />,
    );

    await user.click(
      screen.getByRole('button', { name: /firmar sin cuenta/i }),
    );
    await user.click(screen.getByRole('button', { name: /enviar código/i }));
    await user.type(
      await screen.findByLabelText(/código de verificación/i),
      '123456',
    );
    await user.click(screen.getByRole('button', { name: /verificar código/i }));

    expect(
      await screen.findByText('PDF: https://minio/doc.pdf'),
    ).toBeInTheDocument();
    expect(mockedVerifyCode).toHaveBeenCalledWith(
      'doc-1',
      INVITATION,
      '123456',
    );
    expect(mockedGetDocument).toHaveBeenCalledWith('doc-1', 't-1');
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY)!)).toEqual({
      accessToken: 't-1',
      expiresAt: FUTURE,
    });
  });

  it('tengo una cuenta, sin sesión: guarda el contexto de la invitación y manda a /login', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <GuestAdvancedSignatureView documentId="doc-1" invitation={INVITATION} />,
    );

    await user.click(screen.getByRole('button', { name: /tengo una cuenta/i }));

    expect(push).toHaveBeenCalledWith('/login');
    expect(getPendingSignatureContext()).toEqual({
      documentId: 'doc-1',
      ...INVITATION,
    });
    expect(mockedRequestCode).not.toHaveBeenCalled();
  });

  it('tengo una cuenta, con sesión: vincula la cuenta y lleva al documento en el dashboard', async () => {
    mockedGetAuthToken.mockReturnValue('session-token');
    const user = userEvent.setup();
    renderWithProviders(
      <GuestAdvancedSignatureView documentId="doc-1" invitation={INVITATION} />,
    );

    await user.click(screen.getByRole('button', { name: /tengo una cuenta/i }));

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith('/dashboard/documents/doc-1'),
    );
    expect(mockedPatch).toHaveBeenCalledWith(
      '/api/v1/document/doc-1/link-collaborator',
    );
  });

  it('firma con e.firma, ubicación y el hash del documento revisado; luego olvida el acceso', async () => {
    storeAccess();
    const user = userEvent.setup();
    renderWithProviders(
      <GuestAdvancedSignatureView documentId="doc-1" invitation={INVITATION} />,
    );

    await user.click(
      await screen.findByRole('button', { name: /firmar con e\.firma/i }),
    );
    await user.click(
      screen.getByRole('button', { name: /seleccionar \.key/i }),
    );
    await user.click(
      screen.getByRole('button', { name: /seleccionar \.cer/i }),
    );
    await user.type(
      screen.getByLabelText(/contraseña de la llave privada/i),
      'secreta',
    );
    await user.click(screen.getByRole('button', { name: /firmar documento/i }));

    expect(await screen.findByText(/firma registrada/i)).toBeInTheDocument();
    expect(mockedSign).toHaveBeenCalledWith(
      'doc-1',
      't-1',
      expect.objectContaining({
        password: 'secreta',
        documentHash: HASH,
        geolocation: expect.objectContaining({ latitude: 19.43 }),
        keyFile: expect.any(File),
        cerFile: expect.any(File),
      }),
    );
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('un acceso vencido o revocado vuelve a pedir el código', async () => {
    storeAccess();
    mockedGetDocument.mockRejectedValue(httpError(401));

    renderWithProviders(
      <GuestAdvancedSignatureView documentId="doc-1" invitation={INVITATION} />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /tu acceso venció/i,
    );
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(
      screen.getByRole('button', { name: /firmar sin cuenta/i }),
    ).toBeInTheDocument();
  });

  it('si la invitación ya se vinculó a una cuenta, pide iniciar sesión', async () => {
    storeAccess();
    mockedGetDocument.mockRejectedValue(httpError(403));

    renderWithProviders(
      <GuestAdvancedSignatureView documentId="doc-1" invitation={INVITATION} />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /vinculada a una cuenta/i,
    );
  });

  it('no ofrece firmar si ya no le toca', async () => {
    storeAccess();
    mockedGetDocument.mockResolvedValue({
      documentId: 'doc-1',
      fileName: 'contrato.pdf',
      documentStatus: DocumentStatus.PendingSignature,
      signerStatus: ParticipantStatus.Pending,
      canSign: false,
      documentHash: HASH,
      fileUrl: 'https://minio/doc.pdf',
      expiresIn: 86400,
    });

    renderWithProviders(
      <GuestAdvancedSignatureView documentId="doc-1" invitation={INVITATION} />,
    );

    expect(
      await screen.findByText(/no tiene una firma pendiente para ti/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /firmar con e\.firma/i }),
    ).not.toBeInTheDocument();
  });
});
