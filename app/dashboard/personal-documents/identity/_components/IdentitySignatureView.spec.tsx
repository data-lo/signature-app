import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test-utils';
import {
  IdentityCheckOutcome,
  IdentityVerificationStatus,
  SigningCredentialStatus,
} from '@/lib/enums/identity';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import {
  getCurrentIdentityVerificationRequest,
  startDiditVerificationRequest,
  type CurrentIdentityVerification,
  type IdentityVerificationAttempt,
} from '../_requests';
import IdentitySignatureView from './IdentitySignatureView';

jest.mock('../_requests');
jest.mock('@/lib/hooks/useCurrentUser');

/**
 * FilePond monta un widget que jsdom no puede dibujar (mide nodos y usa APIs de arrastre). La
 * pantalla se prueba por su máquina de estados, no por el widget de subida: se sustituye por un
 * marcador para poder afirmar que el paso 2 quedó habilitado.
 */
jest.mock('../../_components/DocumentDropzone', () => ({
  __esModule: true,
  default: ({ label }: { label: string }) => <div>{label}</div>,
}));

const mockedGetCurrent = getCurrentIdentityVerificationRequest as jest.Mock;
const mockedStart = startDiditVerificationRequest as jest.Mock;
const mockedUseCurrentUser = useCurrentUser as jest.Mock;

const HOSTED_URL = 'https://verify.didit.me/session/abc';

function givenStatus(
  status: SigningCredentialStatus,
  verification: CurrentIdentityVerification['verification'] = null,
): void {
  mockedGetCurrent.mockResolvedValue({
    verification,
    signingCredentialStatus: status,
    signingCredentialConfigured:
      status === SigningCredentialStatus.Configured,
    identityVerifiedAt:
      status === SigningCredentialStatus.SignaturePending ||
      status === SigningCredentialStatus.Configured
        ? '2026-08-20T10:00:00.000Z'
        : null,
    signatureRegistered: status === SigningCredentialStatus.Configured,
  } satisfies CurrentIdentityVerification);
}

function openSession(url: string | null): IdentityVerificationAttempt {
  return {
    id: 'attempt-1',
    provider: 'DIDIT',
    status: IdentityVerificationStatus.InProgress,
    url,
    failureReason: null,
    checks: null,
    startedAt: '2026-08-20T09:00:00.000Z',
    completedAt: null,
    expiresAt: null,
    createdAt: '2026-08-20T09:00:00.000Z',
  };
}

describe('IdentitySignatureView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseCurrentUser.mockReturnValue({
      data: {
        signature: { id: 'sig-1', secureUrl: 'https://minio/firma.png' },
      },
    });
  });

  it('sin verificación: ofrece iniciarla y deja el paso 2 bloqueado', async () => {
    givenStatus(SigningCredentialStatus.IdentityVerificationRequired);

    renderWithProviders(<IdentitySignatureView />);

    expect(
      await screen.findByRole('button', { name: /iniciar verificación/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/agregar firma digital · bloqueada/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/se habilita cuando se apruebe tu identidad/i),
    ).toBeInTheDocument();
  });

  it('inicia la verificación con una ruta de retorno relativa', async () => {
    givenStatus(SigningCredentialStatus.IdentityVerificationRequired);
    mockedStart.mockResolvedValue({ url: HOSTED_URL, reused: false });

    renderWithProviders(<IdentitySignatureView />);

    await userEvent.click(
      await screen.findByRole('button', { name: /iniciar verificación/i }),
    );

    await waitFor(() => expect(mockedStart).toHaveBeenCalledTimes(1));
    // Ruta relativa, nunca una URL absoluta: el backend rechaza cualquier otra cosa para no
    // convertirse en un redirect abierto.
    expect(mockedStart.mock.calls[0][0]).toMatch(/^\//);
  });

  it('sesión en curso: muestra el QR y las dos salidas del flujo', async () => {
    givenStatus(
      SigningCredentialStatus.IdentityVerificationInProgress,
      openSession(HOSTED_URL),
    );

    renderWithProviders(<IdentitySignatureView />);

    expect(
      await screen.findByLabelText(/código qr para continuar/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /abrir verificación/i }),
    ).toHaveAttribute('href', HOSTED_URL);
    expect(
      screen.getByRole('button', { name: /copiar enlace/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/permanece visible; aún no se puede modificar/i),
    ).toBeInTheDocument();
  });

  it('sesión en curso ya expirada: no deja un QR muerto en pantalla', async () => {
    givenStatus(
      SigningCredentialStatus.IdentityVerificationPending,
      openSession(null),
    );

    renderWithProviders(<IdentitySignatureView />);

    expect(
      await screen.findByRole('button', {
        name: /iniciar nueva verificación/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/código qr para continuar/i),
    ).not.toBeInTheDocument();
  });

  it('en revisión: informa la espera y no ofrece reintentar', async () => {
    givenStatus(SigningCredentialStatus.IdentityVerificationInReview);

    renderWithProviders(<IdentitySignatureView />);

    expect(
      await screen.findByText(/estamos revisando tu información/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /verificación|intentar/i }),
    ).not.toBeInTheDocument();
  });

  it('rechazo: muestra el motivo del proveedor y el CTA de reintento', async () => {
    givenStatus(SigningCredentialStatus.IdentityVerificationRetryRequired, {
      ...openSession(null),
      status: IdentityVerificationStatus.Declined,
      failureReason: 'El rostro no coincide con la identificación',
    });

    renderWithProviders(<IdentitySignatureView />);

    expect(
      await screen.findByText(/el rostro no coincide con la identificación/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /intentar nuevamente/i }),
    ).toBeInTheDocument();
  });

  it('intentos agotados: conserva la pantalla, sin ningún botón para reintentar', async () => {
    givenStatus(
      SigningCredentialStatus.IdentityVerificationMaxAttemptsExceeded,
    );

    renderWithProviders(<IdentitySignatureView />);

    expect(
      await screen.findByText(/agotaste tus intentos de verificación/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/soporte/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /verificación|intentar/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/agregar firma digital · bloqueada/i),
    ).toBeInTheDocument();
  });

  it('identidad aprobada: habilita el paso 2 y deja de bloquear la firma', async () => {
    givenStatus(SigningCredentialStatus.SignaturePending);

    renderWithProviders(<IdentitySignatureView />);

    expect(
      await screen.findByText(/^tu identidad ha sido verificada$/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Agregar firma digital')).toBeInTheDocument();
    expect(screen.getByText(/selecciona el archivo/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /guardar mi firma/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/firma png · bloqueada/i),
    ).not.toBeInTheDocument();
  });

  it('credencial configurada: muestra la firma registrada con opción de eliminarla', async () => {
    givenStatus(SigningCredentialStatus.Configured);

    renderWithProviders(<IdentitySignatureView />);

    expect(
      await screen.findByText(/tu credencial está lista/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Tu firma ha sido agregada')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /eliminar/i }),
    ).toBeInTheDocument();
    // Los dos pasos quedan marcados como terminados en el encabezado.
    const [identityStep, signatureStep] = screen.getAllByRole('listitem');
    expect(identityStep).toHaveTextContent('Identidad validada');
    expect(signatureStep).toHaveTextContent('Firma registrada');
  });

  describe('detalle de la validación', () => {
    it('muestra qué se comprobó, sin filtrar datos del veredicto crudo', async () => {
      givenStatus(SigningCredentialStatus.SignaturePending, {
        ...openSession(null),
        status: IdentityVerificationStatus.Approved,
        checks: {
          documentReading: IdentityCheckOutcome.Passed,
          faceMatch: IdentityCheckOutcome.Passed,
          liveness: IdentityCheckOutcome.Passed,
        },
      });

      renderWithProviders(<IdentitySignatureView />);

      await userEvent.click(
        await screen.findByRole('button', {
          name: /ver detalle de la validación/i,
        }),
      );

      expect(
        await screen.findByText(/lectura de tu identificación/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/tu rostro coincide con la identificación/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/prueba de vida/i)).toBeInTheDocument();
    });

    it('distingue "no reportada" de "no superada": no alarma por una comprobación ausente', async () => {
      givenStatus(SigningCredentialStatus.SignaturePending, {
        ...openSession(null),
        status: IdentityVerificationStatus.Approved,
        checks: {
          documentReading: IdentityCheckOutcome.Passed,
          faceMatch: IdentityCheckOutcome.Failed,
          liveness: null,
        },
      });

      renderWithProviders(<IdentitySignatureView />);

      await userEvent.click(
        await screen.findByRole('button', {
          name: /ver detalle de la validación/i,
        }),
      );

      expect(await screen.findByText(/no superada/i)).toBeInTheDocument();
      expect(screen.getByText(/no reportada/i)).toBeInTheDocument();
    });

    it('sin detalle de comprobaciones lo indica, en vez de pintar tres renglones vacíos', async () => {
      givenStatus(SigningCredentialStatus.SignaturePending, {
        ...openSession(null),
        status: IdentityVerificationStatus.Approved,
        checks: null,
      });

      renderWithProviders(<IdentitySignatureView />);

      await userEvent.click(
        await screen.findByRole('button', {
          name: /ver detalle de la validación/i,
        }),
      );

      expect(
        await screen.findByText(/no contamos con el detalle de las comprobaciones/i),
      ).toBeInTheDocument();
    });
  });

  it('si el estado no carga, no inventa una pantalla: avisa y ofrece reintentar', async () => {
    mockedGetCurrent.mockRejectedValue(new Error('backend caído'));

    renderWithProviders(<IdentitySignatureView />);

    expect(
      await screen.findByText(/no se pudo cargar el estado de tu identidad/i),
    ).toBeInTheDocument();
  });
});
