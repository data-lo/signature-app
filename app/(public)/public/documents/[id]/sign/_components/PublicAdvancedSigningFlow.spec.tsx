import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import toast from 'react-hot-toast';
import { renderWithProviders, screen, waitFor } from '@/test-utils';
import { DocumentStatus, ParticipantStatus } from '@/lib/enums/document';
import {
  getGuestAdvancedSigningDocumentRequest,
  requestGuestAdvancedAccessCodeRequest,
  signGuestAdvancedDocumentRequest,
  verifyGuestAdvancedAccessCodeRequest,
} from '../../advanced-signature/_requests';
import { guestAccessStorageKey } from '../../biometric-signature/_hooks/useGuestAccess';
import { ADVANCED_GUEST_ACCESS_PREFIX } from '../../advanced-signature/_hooks/useGuestAdvancedSignature';
import PublicAdvancedSigningFlow from './PublicAdvancedSigningFlow';

jest.mock('../../advanced-signature/_requests');
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

/** La pantalla pública `/sign` sólo conoce el colaborador; el correo no viaja. */
const INVITATION = { collaboratorId: 'c-1' };
const MASKED_EMAIL = 'a***@correo.mx';
const FUTURE = new Date(Date.now() + 10 * 60 * 1000).toISOString();
const HASH = 'f'.repeat(64);
const STORAGE_KEY = guestAccessStorageKey(
  'doc-1',
  ADVANCED_GUEST_ACCESS_PREFIX,
);
const SIGNING_DOCUMENT = {
  documentId: 'doc-1',
  fileName: 'contrato.pdf',
  documentStatus: DocumentStatus.PendingSignature,
  signerStatus: ParticipantStatus.Pending,
  canSign: true,
  documentHash: HASH,
  fileUrl: 'https://minio/doc.pdf',
  expiresIn: 86400,
};

const mockedRequestCode = requestGuestAdvancedAccessCodeRequest as jest.Mock;
const mockedVerifyCode = verifyGuestAdvancedAccessCodeRequest as jest.Mock;
const mockedGetDocument = getGuestAdvancedSigningDocumentRequest as jest.Mock;
const mockedSign = signGuestAdvancedDocumentRequest as jest.Mock;

function httpError(status: number, message?: string): AxiosError {
  return new AxiosError(String(status), String(status), undefined, undefined, {
    status,
    data: message ? { message } : {},
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

function renderFlow() {
  return renderWithProviders(
    <PublicAdvancedSigningFlow
      documentId="doc-1"
      invitation={INVITATION}
      maskedEmail={MASKED_EMAIL}
    />,
  );
}

/** Abre el diálogo, carga `.key`, `.cer` y contraseña, y confirma la firma. */
async function signWithEfirma(
  user: ReturnType<typeof userEvent.setup>,
  password = 'secreta',
) {
  await user.click(
    await screen.findByRole('button', { name: /firmar con e\.firma/i }),
  );
  await user.click(screen.getByRole('button', { name: /seleccionar \.key/i }));
  await user.click(screen.getByRole('button', { name: /seleccionar \.cer/i }));
  await user.type(
    screen.getByLabelText(/contraseña de la llave privada/i),
    password,
  );
  await user.click(screen.getByRole('button', { name: /firmar documento/i }));
}

describe('PublicAdvancedSigningFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    mockGeolocation();
    mockedRequestCode.mockResolvedValue({ emailDelivered: true });
    mockedVerifyCode.mockResolvedValue({
      accessToken: 't-1',
      expiresAt: FUTURE,
    });
    mockedGetDocument.mockResolvedValue(SIGNING_DOCUMENT);
    mockedSign.mockResolvedValue({ documentCompleted: true });
  });

  it('paso 1: pide confirmar el correo enmascarado por el backend, sin pedir cuenta', () => {
    renderFlow();

    expect(screen.getByText(/paso 1 de 2/i)).toBeInTheDocument();
    expect(screen.getByText(MASKED_EMAIL)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /enviar código/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/iniciar sesión/i)).not.toBeInTheDocument();
  });

  it('valida el código sin mandar correo y pasa a revisar el documento', async () => {
    const user = userEvent.setup();
    renderFlow();

    await user.click(screen.getByRole('button', { name: /enviar código/i }));
    expect(
      await screen.findByText(/te enviamos el código a a\*\*\*@correo\.mx/i),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText(/código de verificación/i), '123456');
    await user.click(screen.getByRole('button', { name: /verificar código/i }));

    expect(
      await screen.findByText('PDF: https://minio/doc.pdf'),
    ).toBeInTheDocument();
    expect(screen.getByText(/paso 2 de 2/i)).toBeInTheDocument();
    expect(screen.getByText(/correo confirmado/i)).toBeInTheDocument();
    expect(mockedRequestCode).toHaveBeenCalledWith('doc-1', INVITATION);
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

  it('si el correo no sale, lo dice y deja reenviar', async () => {
    mockedRequestCode.mockResolvedValue({ emailDelivered: false });
    const user = userEvent.setup();
    renderFlow();

    await user.click(screen.getByRole('button', { name: /enviar código/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /no pudimos enviar el correo/i,
    );
    expect(
      screen.getByRole('button', { name: /reenviar código/i }),
    ).toBeInTheDocument();
  });

  it('un código incorrecto muestra el mensaje del backend y no avanza', async () => {
    mockedVerifyCode.mockRejectedValue(
      httpError(400, 'El código no es válido o ya expiró'),
    );
    const user = userEvent.setup();
    renderFlow();

    await user.click(screen.getByRole('button', { name: /enviar código/i }));
    await user.type(
      await screen.findByLabelText(/código de verificación/i),
      '000000',
    );
    await user.click(screen.getByRole('button', { name: /verificar código/i }));

    expect(
      await screen.findByText('El código no es válido o ya expiró'),
    ).toBeInTheDocument();
    expect(mockedGetDocument).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('firma con e.firma, ubicación y el hash revisado; confirma el registro y olvida el acceso', async () => {
    storeAccess();
    const user = userEvent.setup();
    renderFlow();

    await signWithEfirma(user);

    expect(await screen.findByText(/firma registrada/i)).toBeInTheDocument();
    expect(screen.getByText(/quedó firmado por todos/i)).toBeInTheDocument();
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

  it('si faltan firmantes, avisa que se notificará a los demás', async () => {
    storeAccess();
    mockedSign.mockResolvedValue({ documentCompleted: false });
    const user = userEvent.setup();
    renderFlow();

    await signWithEfirma(user);

    expect(
      await screen.findByText(/avisaremos a los demás firmantes/i),
    ).toBeInTheDocument();
  });

  it('una e.firma inválida (422) avisa con el mensaje del backend y conserva el acceso para reintentar', async () => {
    storeAccess();
    mockedSign.mockRejectedValue(
      httpError(422, 'La contraseña de la llave privada es incorrecta'),
    );
    const user = userEvent.setup();
    renderFlow();

    await signWithEfirma(user, 'equivocada');

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'La contraseña de la llave privada es incorrecta',
      ),
    );
    expect(screen.queryByText(/firma registrada/i)).not.toBeInTheDocument();
    expect(sessionStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it('si el documento cambió (400), lo vuelve a cargar para revisarlo antes de reintentar', async () => {
    storeAccess();
    mockedSign.mockRejectedValue(
      httpError(
        400,
        'El documento cambió desde que lo revisaste. Vuelve a abrirlo antes de firmar.',
      ),
    );
    const user = userEvent.setup();
    renderFlow();

    await signWithEfirma(user);

    await waitFor(() => expect(mockedGetDocument).toHaveBeenCalledTimes(2));
    expect(toast.error).toHaveBeenCalledWith(
      'El documento cambió desde que lo revisaste. Vuelve a abrirlo antes de firmar.',
    );
  });

  it('sin permiso de ubicación no envía la firma', async () => {
    storeAccess();
    Object.defineProperty(global.navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: jest.fn(
          (_success: PositionCallback, error: PositionErrorCallback) =>
            error({
              code: 1,
              PERMISSION_DENIED: 1,
            } as GeolocationPositionError),
        ),
      },
    });
    const user = userEvent.setup();
    renderFlow();

    await signWithEfirma(user);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/no se puede firmar sin tu ubicación/i),
      ),
    );
    expect(mockedSign).not.toHaveBeenCalled();
  });

  it('un acceso vencido o revocado (401) vuelve a pedir el código con un aviso', async () => {
    storeAccess();
    mockedGetDocument.mockRejectedValue(httpError(401));

    renderFlow();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /tu acceso venció/i,
    );
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(
      screen.getByRole('button', { name: /enviar código/i }),
    ).toBeInTheDocument();
  });

  it('si la invitación se vinculó a una cuenta (403), lo dice y deja de ofrecer la firma sin cuenta', async () => {
    storeAccess();
    mockedGetDocument.mockRejectedValue(httpError(403));

    renderFlow();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /vinculada a una cuenta/i,
    );
    expect(
      screen.queryByRole('button', { name: /enviar código/i }),
    ).not.toBeInTheDocument();
  });

  it('no ofrece firmar si ya no le toca', async () => {
    storeAccess();
    mockedGetDocument.mockResolvedValue({
      ...SIGNING_DOCUMENT,
      canSign: false,
    });

    renderFlow();

    expect(
      await screen.findByText(/no tiene una firma pendiente para ti/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /firmar con e\.firma/i }),
    ).not.toBeInTheDocument();
  });
});
