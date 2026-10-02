import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { BiometricSignatureStatus } from '@/lib/enums/document';
import type { BiometricSignatureSession } from '../_requests';
import BiometricSignaturePanel, {
  toBiometricSignatureViewKind,
  type BiometricSigningProps,
} from './BiometricSignaturePanel';

function session(
  overrides: Partial<BiometricSignatureSession> = {},
): BiometricSignatureSession {
  return {
    attemptId: 'attempt-1',
    status: BiometricSignatureStatus.Pending,
    url: 'https://verify.didit.me/session/abc',
    expiresAt: null,
    reused: false,
    signatureCompleted: false,
    documentCompleted: false,
    ...overrides,
  };
}

function renderPanel(overrides: Partial<BiometricSigningProps> = {}) {
  const props: BiometricSigningProps = {
    session: null,
    isLoading: false,
    geoBlockedReason: null,
    isRequestingLocation: false,
    isStarting: false,
    onStart: jest.fn(),
    ...overrides,
  };
  render(<BiometricSignaturePanel {...props} />);
  return props;
}

describe('toBiometricSignatureViewKind', () => {
  it.each([
    [null, 'idle'],
    [BiometricSignatureStatus.Pending, 'pending'],
    [BiometricSignatureStatus.InProgress, 'inProgress'],
    [BiometricSignatureStatus.InReview, 'inProgress'],
    [BiometricSignatureStatus.Approved, 'approved'],
    [BiometricSignatureStatus.Declined, 'declined'],
    [BiometricSignatureStatus.Expired, 'expired'],
    [BiometricSignatureStatus.Abandoned, 'expired'],
    [BiometricSignatureStatus.Failed, 'retry'],
  ])('%s → %s', (status, expected) => {
    expect(
      toBiometricSignatureViewKind(status ? session({ status }) : null),
    ).toBe(expected);
  });
});

describe('BiometricSignaturePanel', () => {
  it('sin sesión ofrece "Firmar con biometría"', async () => {
    const props = renderPanel();

    await userEvent.click(
      screen.getByRole('button', { name: /firmar con biometría/i }),
    );

    expect(props.onStart).toHaveBeenCalledTimes(1);
  });

  it('pendiente: muestra el estado y el QR de Didit', () => {
    renderPanel({ session: session() });

    expect(
      screen.getByText(/verificación biométrica pendiente/i),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/código qr para continuar la verificación/i),
    ).toBeInTheDocument();
  });

  it('pendiente sin URL todavía: indica que se está preparando, sin QR', () => {
    renderPanel({ session: session({ url: null }) });

    expect(screen.getByText(/preparando la sesión/i)).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/código qr para continuar la verificación/i),
    ).not.toBeInTheDocument();
  });

  it('en revisión: avisa que se espera el resultado', () => {
    renderPanel({
      session: session({
        status: BiometricSignatureStatus.InReview,
        url: null,
      }),
    });

    expect(screen.getByText(/está en revisión/i)).toBeInTheDocument();
  });

  it('aprobada: indica que se está registrando la firma, sin botones', () => {
    renderPanel({
      session: session({
        status: BiometricSignatureStatus.Approved,
        url: null,
      }),
    });

    expect(screen.getByText(/verificación aprobada/i)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it.each([
    [BiometricSignatureStatus.Declined, /fue rechazada/i],
    [BiometricSignatureStatus.Expired, /expiró/i],
    [BiometricSignatureStatus.Failed, /no se pudo completar/i],
  ])('%s: explica el motivo y ofrece reintentar', async (status, message) => {
    const props = renderPanel({ session: session({ status, url: null }) });

    expect(screen.getByRole('alert')).toHaveTextContent(message);
    await userEvent.click(
      screen.getByRole('button', { name: /volver a intentar/i }),
    );
    expect(props.onStart).toHaveBeenCalledTimes(1);
  });

  it('bloquea el botón mientras obtiene la ubicación', () => {
    renderPanel({ isRequestingLocation: true });

    expect(
      screen.getByRole('button', { name: /obteniendo ubicación/i }),
    ).toBeDisabled();
  });
});
