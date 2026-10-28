import { forwardRef, useImperativeHandle } from 'react';
import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import { renderWithProviders, screen, waitFor } from '@/test-utils';
import { SigningCredentialStatus } from '@/lib/enums/identity';
import { SigningSessionProvider } from '../SigningSessionProvider';
import {
  getBiometricSigningStatusRequest,
  getCurrentSigningDocumentRequest,
  getCurrentSigningSessionRequest,
  getIdentityVerificationRequest,
  signAdvancedRequest,
  signSimpleRequest,
  startBiometricSigningRequest,
  startIdentityVerificationRequest,
  type IdentityVerificationState,
} from '../invitation/invitation-requests';
import SigningSessionScreen from '../invitation/SigningSessionScreen';
import type { SigningSession } from '../signing-session';
import SessionAdvancedSignatureFlow from './SessionAdvancedSignatureFlow';
import SessionBiometricSignatureFlow from './SessionBiometricSignatureFlow';
import SessionSimpleSignatureFlow from './SessionSimpleSignatureFlow';
import toast from 'react-hot-toast';

jest.mock('../invitation/invitation-requests');
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
jest.mock('@/lib/hooks/useGeolocation', () => ({
  useGeolocation: () => ({
    status: 'idle',
    requestLocation: async () => ({
      coords: { latitude: 19.4, longitude: -99.1 },
    }),
  }),
}));
const PNG = new Blob(['png'], { type: 'image/png' });
jest.mock('@/components/signature/SignaturePad', () => ({
  __esModule: true,
  default: forwardRef(function PadStub(
    { onStrokeChange }: { onStrokeChange?: (value: boolean) => void },
    ref,
  ) {
    useImperativeHandle(ref, () => ({
      clear: () => onStrokeChange?.(false),
      toPngBlob: async () => PNG,
      isEmpty: () => false,
    }));
    return (
      <button type="button" onClick={() => onStrokeChange?.(true)}>
        dibujar
      </button>
    );
  }),
}));
jest.mock(
  '@/app/dashboard/documents/[documentId]/_components/AdvancedSignatureDialog',
  () => ({
    __esModule: true,
    default: ({
      open,
      onSubmit,
    }: {
      open: boolean;
      onSubmit: (values: unknown) => void;
    }) =>
      open ? (
        <button
          type="button"
          onClick={() =>
            onSubmit({
              password: 'secreta',
              keyFile: new File(['k'], 'a.key'),
              cerFile: new File(['c'], 'a.cer'),
            })
          }
        >
          confirmar e.firma
        </button>
      ) : null,
  }),
);

const HASH = 'h'.repeat(64);

/** Estado de identidad de la sesión simple, con lo que se indique encima. */
function identity(
  overrides: Partial<IdentityVerificationState> = {},
): IdentityVerificationState {
  return {
    status: 'APPROVED',
    verificationId: 'iv-1',
    dataMatches: true,
    resumeUrl: null,
    satisfied: true,
    errorCode: null,
    ...overrides,
  };
}

/** Error de la sesión pública con su código estable. */
function codedError(status: number, code: string) {
  return new AxiosError(String(status), String(status), undefined, undefined, {
    status,
    data: {
      statusCode: status,
      error: 'x',
      code,
      message: 'texto del backend',
    },
  } as AxiosResponse);
}

function session(
  type: SigningSession['signature']['type'],
  credentialStatus: string | null = null,
  extra: Partial<NonNullable<SigningSession['sessionDetails']>> = {},
): SigningSession {
  return {
    status: 'ACTIVE',
    document: { id: null, name: 'contrato.pdf' },
    signer: {
      collaboratorId: null,
      maskedEmail: 'a***@correo.com',
      accountStatus: 'PROVISIONED',
      guestSigningAllowed: true,
    },
    signature: {
      type,
      requiresEmailVerification: true,
      requiresIdentityValidation: type !== 'ADVANCED',
    },
    positions: [],
    sessionDetails: {
      documentHash: HASH,
      canSign: true,
      credentialStatus,
      ...extra,
    },
  };
}

function renderFlow(
  Flow: typeof SessionAdvancedSignatureFlow,
  value: SigningSession,
  onSuccess = jest.fn(),
) {
  renderWithProviders(
    <SigningSessionProvider state={value}>
      <Flow session={value} onSuccess={onSuccess} onError={jest.fn()} />
    </SigningSessionProvider>,
  );
  return onSuccess;
}

const SIGNED = {
  success: true,
  message: 'ok',
  data: { id: 'd-1', documentCompleted: false },
};

describe('flujos de la sesión pública de firma', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentSigningDocumentRequest as jest.Mock).mockResolvedValue({
      fileUrl: 'https://minio/contrato.pdf',
      expiresIn: 300,
      documentHash: HASH,
    });
    (signAdvancedRequest as jest.Mock).mockResolvedValue(SIGNED);
    (signSimpleRequest as jest.Mock).mockResolvedValue(SIGNED);
  });

  describe('avanzada', () => {
    it('firma con la e.firma, el hash del PDF revisado y una Idempotency-Key; muestra el estado final', async () => {
      const user = userEvent.setup();
      const onSuccess = renderFlow(
        SessionAdvancedSignatureFlow,
        session('ADVANCED'),
      );

      await user.click(
        await screen.findByRole('button', { name: /firmar con e.firma/i }),
      );
      await user.click(
        screen.getByRole('button', { name: /confirmar e.firma/i }),
      );

      expect(await screen.findByText('Firma registrada')).toBeInTheDocument();
      const [payload, key] = (signAdvancedRequest as jest.Mock).mock.calls[0];
      expect(payload).toEqual(
        expect.objectContaining({
          password: 'secreta',
          documentHash: HASH,
          geolocation: { latitude: 19.4, longitude: -99.1 },
        }),
      );
      expect(key).toEqual(expect.any(String));
      expect(onSuccess).toHaveBeenCalledWith({ documentCompleted: false });
    });

    it('un reintento tras un error usa la misma Idempotency-Key', async () => {
      (signAdvancedRequest as jest.Mock)
        .mockRejectedValueOnce(
          new AxiosError('500', '500', undefined, undefined, {
            status: 500,
            data: {},
          } as AxiosResponse),
        )
        .mockResolvedValueOnce(SIGNED);
      const user = userEvent.setup();
      renderFlow(SessionAdvancedSignatureFlow, session('ADVANCED'));

      await user.click(
        await screen.findByRole('button', { name: /firmar con e.firma/i }),
      );
      await user.click(
        screen.getByRole('button', { name: /confirmar e.firma/i }),
      );
      await waitFor(() => expect(signAdvancedRequest).toHaveBeenCalledTimes(1));
      await user.click(
        screen.getByRole('button', { name: /confirmar e.firma/i }),
      );

      await screen.findByText('Firma registrada');
      const keys = (signAdvancedRequest as jest.Mock).mock.calls.map(
        ([, key]) => key,
      );
      expect(keys[0]).toBe(keys[1]);
    });

    it('muestra qué se validará del certificado', async () => {
      renderFlow(
        SessionAdvancedSignatureFlow,
        session('ADVANCED', null, {
          certificateRequirements: {
            validateValidity: true,
            validateRevocation: true,
            validateSubjectMatch: true,
          },
        }),
      );

      expect(
        await screen.findByText('Que el SAT no lo haya revocado'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Que su titular sea la persona invitada a firmar'),
      ).toBeInTheDocument();
    });

    it.each([
      ['CERTIFICATE_REVOKED', /revocado/i],
      ['CERTIFICATE_INVALID', /no es válida/i],
      [
        'CERTIFICATE_SUBJECT_MISMATCH',
        /titular de la e\.firma no corresponde/i,
      ],
      ['SIGNATURE_VALIDATION_FAILED', /no corresponde al documento/i],
    ])(
      'un certificado rechazado (%s) muestra el mensaje controlado de su código, no el del backend',
      async (code, message) => {
        (signAdvancedRequest as jest.Mock).mockRejectedValueOnce(
          codedError(422, code),
        );
        const user = userEvent.setup();
        renderFlow(SessionAdvancedSignatureFlow, session('ADVANCED'));

        await user.click(
          await screen.findByRole('button', { name: /firmar con e.firma/i }),
        );
        await user.click(
          screen.getByRole('button', { name: /confirmar e.firma/i }),
        );

        await waitFor(() =>
          expect(toast.error).toHaveBeenCalledWith(
            expect.stringMatching(message),
          ),
        );
        expect(toast.error).not.toHaveBeenCalledWith('texto del backend');
        expect(screen.queryByText('Firma registrada')).not.toBeInTheDocument();
      },
    );
  });

  describe('simple', () => {
    it('sin identidad verificada: abre Didit con regreso a /sign/session, sin mostrar el PDF todavía', async () => {
      // La redirección en sí (`window.location.assign`) no se afirma: jsdom no deja interceptarla
      // (mismo criterio que `PaymentServicesView.spec`). Se afirma la petición a Didit.
      const notStarted = identity({
        status: 'NOT_STARTED',
        satisfied: false,
        dataMatches: null,
        errorCode: 'IDENTITY_VERIFICATION_REQUIRED',
      });
      (getIdentityVerificationRequest as jest.Mock).mockResolvedValue(
        notStarted,
      );
      (startIdentityVerificationRequest as jest.Mock).mockResolvedValue({
        url: 'https://verify.didit.me/s/1',
      });
      const user = userEvent.setup();
      renderFlow(
        SessionSimpleSignatureFlow,
        session(
          'SIMPLE',
          SigningCredentialStatus.IdentityVerificationRequired,
          { identityVerification: notStarted },
        ),
      );

      await user.click(
        screen.getByRole('button', { name: /verificar identidad/i }),
      );

      expect(startIdentityVerificationRequest).toHaveBeenCalledWith(
        '/sign/session',
      );
      expect(screen.queryByText(/^PDF:/)).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /firmar documento/i }),
      ).not.toBeInTheDocument();
    });

    it('mientras Didit decide consulta el estado y habilita la firma al aprobarse', async () => {
      const pending = identity({
        status: 'IN_PROGRESS',
        satisfied: false,
        dataMatches: null,
        resumeUrl: 'https://verify.didit.me/s/1',
        errorCode: 'IDENTITY_VERIFICATION_REQUIRED',
      });
      (getIdentityVerificationRequest as jest.Mock).mockResolvedValueOnce(
        identity(),
      );
      renderFlow(
        SessionSimpleSignatureFlow,
        session('SIMPLE', SigningCredentialStatus.Configured, {
          identityVerification: pending,
        }),
      );

      expect(
        screen.getByRole('link', { name: /continuar verificación/i }),
      ).toHaveAttribute('href', 'https://verify.didit.me/s/1');
      expect(
        screen.queryByRole('button', { name: /firmar documento/i }),
      ).not.toBeInTheDocument();

      expect(
        await screen.findByRole(
          'button',
          { name: /firmar documento/i },
          { timeout: 8000 },
        ),
      ).toBeEnabled();
      expect(getIdentityVerificationRequest).toHaveBeenCalled();
    }, 15000);

    it.each([
      [
        'rechazada',
        identity({
          status: 'REJECTED',
          satisfied: false,
          dataMatches: null,
          errorCode: 'IDENTITY_VERIFICATION_REJECTED',
        }),
        /no pudimos verificar tu identidad/i,
      ],
      [
        'de otra persona',
        identity({
          satisfied: false,
          dataMatches: false,
          errorCode: 'IDENTITY_DATA_MISMATCH',
        }),
        /no corresponde a la persona invitada/i,
      ],
    ])(
      'identidad %s: lo explica y no deja firmar ni reintentar',
      async (_name, state, message) => {
        (getIdentityVerificationRequest as jest.Mock).mockResolvedValue(state);
        renderFlow(
          SessionSimpleSignatureFlow,
          session('SIMPLE', SigningCredentialStatus.Configured, {
            identityVerification: state,
          }),
        );

        expect(await screen.findByRole('alert')).toHaveTextContent(message);
        expect(
          screen.queryByRole('button', {
            name: /firmar documento|verificar identidad/i,
          }),
        ).not.toBeInTheDocument();
      },
    );

    it('si al firmar la identidad ya no cumple, muestra el mensaje de su código y vuelve a consultarla', async () => {
      (signSimpleRequest as jest.Mock).mockRejectedValueOnce(
        codedError(403, 'IDENTITY_DATA_MISMATCH'),
      );
      (getIdentityVerificationRequest as jest.Mock).mockResolvedValue(
        identity(),
      );
      const user = userEvent.setup();
      renderFlow(
        SessionSimpleSignatureFlow,
        session('SIMPLE', SigningCredentialStatus.Configured, {
          identityVerification: identity(),
        }),
      );

      await user.click(
        await screen.findByRole('button', { name: /firmar documento/i }),
      );

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringMatching(/no corresponde a la persona invitada/i),
        ),
      );
      await waitFor(() =>
        expect(getIdentityVerificationRequest).toHaveBeenCalled(),
      );
    });

    it('identidad aprobada sin rúbrica: hay que dibujarla y se manda con la firma', async () => {
      const user = userEvent.setup();
      renderFlow(
        SessionSimpleSignatureFlow,
        session('SIMPLE', SigningCredentialStatus.SignaturePending),
      );

      const signButton = await screen.findByRole('button', {
        name: /firmar documento/i,
      });
      expect(signButton).toBeDisabled();
      await user.click(screen.getByRole('button', { name: 'dibujar' }));
      await user.click(signButton);

      await screen.findByText('Firma registrada');
      expect(signSimpleRequest).toHaveBeenCalledWith(
        expect.objectContaining({ documentHash: HASH, signatureImage: PNG }),
        expect.any(String),
      );
    });

    it('con la credencial completa firma con su rúbrica registrada', async () => {
      const user = userEvent.setup();
      renderFlow(
        SessionSimpleSignatureFlow,
        session('SIMPLE', SigningCredentialStatus.Configured),
      );

      await user.click(
        await screen.findByRole('button', { name: /firmar documento/i }),
      );

      await screen.findByText('Firma registrada');
      expect(signSimpleRequest).toHaveBeenCalledWith(
        expect.objectContaining({ signatureImage: undefined }),
        expect.any(String),
      );
    });
  });

  describe('biométrica', () => {
    it('abre la sesión de Didit con la ubicación y una Idempotency-Key', async () => {
      (getBiometricSigningStatusRequest as jest.Mock).mockResolvedValue(null);
      (startBiometricSigningRequest as jest.Mock).mockResolvedValue({
        status: 'PENDING',
        url: 'https://verify.didit.me/s/2',
        signatureCompleted: false,
      });
      const user = userEvent.setup();
      renderFlow(SessionBiometricSignatureFlow, session('BIOMETRIC'));

      await user.click(await screen.findByRole('checkbox'));
      await user.click(
        screen.getByRole('button', { name: /firmar con biometría|iniciar/i }),
      );

      await waitFor(() =>
        expect(startBiometricSigningRequest).toHaveBeenCalledWith(
          { latitude: 19.4, longitude: -99.1 },
          expect.any(String),
        ),
      );
    });

    it('cuando el webhook registró la firma, lo informa una sola vez', async () => {
      (getBiometricSigningStatusRequest as jest.Mock).mockResolvedValue({
        status: 'APPROVED',
        signatureCompleted: true,
        documentCompleted: true,
      });
      const onSuccess = renderFlow(
        SessionBiometricSignatureFlow,
        session('BIOMETRIC'),
      );

      await waitFor(() =>
        expect(onSuccess).toHaveBeenCalledWith({ documentCompleted: true }),
      );
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it('sin sesión vigente (/sign/session tras vencer): pide volver a abrir el enlace', async () => {
    (getCurrentSigningSessionRequest as jest.Mock).mockRejectedValue(
      new AxiosError('401', '401', undefined, undefined, {
        status: 401,
        data: {},
      } as AxiosResponse),
    );
    renderWithProviders(<SigningSessionScreen />);

    expect(
      await screen.findByText(/tu sesión de firma venció/i),
    ).toBeInTheDocument();
    expect(getCurrentSigningDocumentRequest).not.toHaveBeenCalled();
  });
});
