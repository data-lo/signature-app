import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import { renderWithProviders, screen } from '@/test-utils';
import {
  getCurrentSigningDocumentRequest,
  getCurrentSigningSessionRequest,
  openInvitationRequest,
  openLaunchRequest,
  requestInvitationCodeRequest,
  verifyInvitationCodeRequest,
  type CurrentSigningSession,
  type InvitationContext,
} from './invitation-requests';
import { getAuthToken } from '@/lib/cookies';
import InvitationSigningEntry, {
  type InvitationSource,
} from './InvitationSigningEntry';

jest.mock('./invitation-requests');
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
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));
jest.mock('@/lib/cookies', () => ({ getAuthToken: jest.fn() }));

const mockedOpenInvitation = openInvitationRequest as jest.Mock;
const mockedOpenLaunch = openLaunchRequest as jest.Mock;
const mockedRequestCode = requestInvitationCodeRequest as jest.Mock;
const mockedVerifyCode = verifyInvitationCodeRequest as jest.Mock;
const mockedCurrent = getCurrentSigningSessionRequest as jest.Mock;
const mockedDocument = getCurrentSigningDocumentRequest as jest.Mock;
const mockedAuthToken = getAuthToken as jest.Mock;

const EMAIL: InvitationSource = { kind: 'EMAIL', token: 'q'.repeat(43) };
const LAUNCH: InvitationSource = {
  kind: 'THIRD_PARTY_PORTAL',
  token: `sla_${'l'.repeat(43)}`,
};

const ACTIVE: InvitationContext = {
  status: 'ACTIVE',
  document: { name: 'contrato.pdf' },
  signer: {
    maskedEmail: 'a***@correo.com',
    accountStatus: null,
    publicSigningAllowed: true,
  },
  signature: {
    type: 'FIEL',
    requiresEmailVerification: true,
    requiresIdentityValidation: false,
  },
  expiresAt: '2026-11-03T00:00:00.000Z',
};

const CURRENT: CurrentSigningSession = {
  status: 'READY_TO_SIGN',
  document: {
    name: 'contrato.pdf',
    status: 'PENDING_SIGNATURE',
    totalPages: 1,
    documentHash: 'h'.repeat(64),
  },
  signer: {
    name: 'Ana López',
    emailMasked: 'a***@correo.com',
    maskedEmail: 'a***@correo.com',
    isProvisional: false,
    status: 'PENDING',
    canSign: true,
    accountStatus: null,
  },
  signature: {
    type: 'ADVANCED',
    emailVerified: true,
    requiresEmailVerification: true,
    requiresIdentityValidation: false,
    identityProvider: null,
    requiresCertificateValidation: true,
    certificateRequirements: {
      validateValidity: true,
      validateRevocation: true,
      validateSubjectMatch: true,
    },
    credentialStatus: null,
    identityVerification: null,
  },
  positions: [],
  session: { expiresAt: '2026-10-27T20:00:00.000Z' },
};

function httpError(status: number): AxiosError {
  return new AxiosError(String(status), String(status), undefined, undefined, {
    status,
    data: {},
  } as AxiosResponse);
}

function renderEntry(source: InvitationSource) {
  return renderWithProviders(<InvitationSigningEntry source={source} />);
}

describe('InvitationSigningEntry (/sign/:token y /sign/launch/:token)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedRequestCode.mockResolvedValue({
      maskedEmail: 'a***@correo.com',
      emailDelivered: true,
      resendAfterSeconds: 60,
    });
    mockedVerifyCode.mockResolvedValue({ expiresAt: '2026-10-27T20:00:00Z' });
    mockedCurrent.mockResolvedValue(CURRENT);
    mockedDocument.mockResolvedValue({
      fileUrl: 'https://minio/contrato.pdf',
      expiresIn: 300,
      documentHash: 'h'.repeat(64),
    });
  });

  it.each([
    ['el correo', EMAIL, mockedOpenInvitation],
    ['el portal del tercero', LAUNCH, mockedOpenLaunch],
  ])(
    'desde %s: canjea su token y pide el código al correo enmascarado, sin mostrar el PDF',
    async (_origin, source, opener) => {
      opener.mockResolvedValue(ACTIVE);
      renderEntry(source);

      expect(await screen.findByText('a***@correo.com')).toBeInTheDocument();
      expect(opener).toHaveBeenCalledWith(source.token);
      expect(
        screen.getByText('Vas a firmar: contrato.pdf'),
      ).toBeInTheDocument();
      expect(screen.queryByText(/^PDF:/)).not.toBeInTheDocument();
      // El correo nunca se edita: no hay campo para escribirlo.
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    },
  );

  it('con el código válido abre la MISMA sesión pública y monta el flujo del tipo de firma', async () => {
    mockedOpenLaunch.mockResolvedValue(ACTIVE);
    const user = userEvent.setup();
    renderEntry(LAUNCH);

    await user.click(
      await screen.findByRole('button', { name: /enviar código/i }),
    );
    await user.type(
      screen.getByRole('textbox', { name: /código de verificación/i }),
      '123456',
    );
    await user.click(screen.getByRole('button', { name: /verificar código/i }));

    expect(mockedVerifyCode).toHaveBeenCalledWith('123456', expect.anything());
    expect(
      await screen.findByText('PDF: https://minio/contrato.pdf'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /firmar con e.firma/i }),
    ).toBeInTheDocument();
  });

  it('un código equivocado no abre la sesión ni muestra el documento', async () => {
    mockedOpenInvitation.mockResolvedValue(ACTIVE);
    mockedVerifyCode.mockRejectedValue(httpError(400));
    const user = userEvent.setup();
    renderEntry(EMAIL);

    await user.click(
      await screen.findByRole('button', { name: /enviar código/i }),
    );
    await user.type(
      screen.getByRole('textbox', { name: /código de verificación/i }),
      '000000',
    );
    await user.click(screen.getByRole('button', { name: /verificar código/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(mockedCurrent).not.toHaveBeenCalled();
    expect(screen.queryByText(/^PDF:/)).not.toBeInTheDocument();
  });

  it.each([
    ['WAITING_FOR_PREVIOUS_SIGNER', /todavía no es tu turno/i],
    ['EXPIRED', /invitación vencida/i],
    ['REVOKED', /invitación revocada/i],
    ['ALREADY_SIGNED', /firma completada/i],
    ['DOCUMENT_CANCELLED', /documento cancelado/i],
  ] as const)(
    '%s: estado controlado, sin código ni datos del documento',
    async (status, title) => {
      mockedOpenInvitation.mockResolvedValue({ status });
      renderEntry(EMAIL);

      expect(await screen.findByText(title)).toBeInTheDocument();
      expect(mockedRequestCode).not.toHaveBeenCalled();
      expect(screen.queryByText(/contrato\.pdf/)).not.toBeInTheDocument();
    },
  );

  it('una invitación que se firma desde la cuenta lo dice, sin pedir código', async () => {
    mockedOpenInvitation.mockResolvedValue({
      ...ACTIVE,
      signer: { ...ACTIVE.signer!, publicSigningAllowed: false },
    });
    renderEntry(EMAIL);

    expect(
      await screen.findByText(/firma desde tu cuenta/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /enviar código/i }),
    ).not.toBeInTheDocument();
  });

  const ACCOUNT_SIGNER: InvitationContext = {
    ...ACTIVE,
    document: { name: 'contrato.pdf', id: 'doc-1' },
    signer: {
      maskedEmail: 'a***@correo.com',
      accountStatus: 'ACTIVE',
      publicSigningAllowed: false,
    },
    signature: { ...ACTIVE.signature!, type: 'SIMPLE' },
  };

  it('firmante con cuenta activa sin sesión: inicia sesión y vuelve al documento', async () => {
    mockedAuthToken.mockReturnValue(undefined);
    mockedOpenInvitation.mockResolvedValue(ACCOUNT_SIGNER);
    renderEntry(EMAIL);

    expect(
      await screen.findByText(/inicia sesión para firmar/i),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: /iniciar sesión/i }),
    );

    expect(mockPush).toHaveBeenCalledWith(
      '/login?returnTo=%2Fdashboard%2Fdocuments%2Fdoc-1',
    );
    expect(mockedRequestCode).not.toHaveBeenCalled();
  });

  it('firmante con cuenta activa y sesión iniciada: va directo al documento', async () => {
    mockedAuthToken.mockReturnValue('jwt');
    mockedOpenLaunch.mockResolvedValue(ACCOUNT_SIGNER);
    renderEntry(LAUNCH);

    await userEvent.click(
      await screen.findByRole('button', { name: /ir al documento/i }),
    );

    expect(mockPush).toHaveBeenCalledWith('/dashboard/documents/doc-1');
  });

  it('acceso del portal vencido o ya usado: invitación inválida, sin reintento (es de un solo uso)', async () => {
    mockedOpenLaunch.mockRejectedValue(httpError(404));
    renderEntry(LAUNCH);

    expect(await screen.findByText(/invitación inválida/i)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(mockedOpenLaunch).toHaveBeenCalledTimes(1);
  });

  it('error inesperado con el enlace del correo: se puede reintentar', async () => {
    mockedOpenInvitation
      .mockRejectedValueOnce(httpError(500))
      .mockResolvedValueOnce(ACTIVE);
    const user = userEvent.setup();
    renderEntry(EMAIL);

    await user.click(
      await screen.findByRole('button', { name: /reintentar/i }),
    );
    expect(await screen.findByText('a***@correo.com')).toBeInTheDocument();
  });
});
