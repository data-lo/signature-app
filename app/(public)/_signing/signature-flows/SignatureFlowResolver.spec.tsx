import { renderWithProviders, screen } from '@/test-utils';
import { getAuthToken } from '@/lib/cookies';
import type { SignatureFlowType, SigningSession } from '../signing-session';
import SignatureFlowResolver from './SignatureFlowResolver';

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

function session(
  type: SignatureFlowType | null,
  signer: Partial<SigningSession['signer']> = {},
): SigningSession {
  return {
    status: 'ACTIVE',
    document: { id: 'doc-1', name: 'contrato.pdf' },
    signer: {
      collaboratorId: 'c-1',
      maskedEmail: 'a***@empresa.com',
      accountStatus: 'NONE',
      guestSigningAllowed: type !== 'SIMPLE',
      ...signer,
    },
    signature: {
      type,
      requiresEmailVerification: true,
      requiresIdentityValidation: type === 'BIOMETRIC',
    },
    positions: [],
  };
}

function renderResolver(value: SigningSession) {
  return renderWithProviders(
    <SignatureFlowResolver
      session={value}
      onSuccess={jest.fn()}
      onError={jest.fn()}
    />,
  );
}

describe('SignatureFlowResolver', () => {
  beforeEach(() => {
    sessionStorage.clear();
    push.mockReset();
    (getAuthToken as jest.Mock).mockReturnValue(undefined);
  });

  it('BIOMETRIC: monta el flujo biométrico existente, con el correo enmascarado', () => {
    renderResolver(session('BIOMETRIC'));

    expect(screen.getByText(/firma con biometría/i)).toBeInTheDocument();
    expect(screen.getByText('a***@empresa.com')).toBeInTheDocument();
  });

  it('ADVANCED: monta la Firma Avanzada sin cuenta existente', () => {
    renderResolver(session('ADVANCED'));

    expect(
      screen.getByText(/firma electrónica avanzada sin cuenta/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/biometría/i)).not.toBeInTheDocument();
  });

  it('SIMPLE: continúa desde la cuenta, sin flujos de invitado', () => {
    renderResolver(session('SIMPLE'));

    expect(screen.getByText(/firma desde tu cuenta/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /iniciar sesión/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/código/i)).not.toBeInTheDocument();
  });

  it('SIMPLE con cuenta PROVISIONED: estado controlado, sin mandar a un login que la rechazaría', () => {
    renderResolver(session('SIMPLE', { accountStatus: 'PROVISIONED' }));

    expect(
      screen.getByText(/cuenta pendiente de activar/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('ADVANCED con cuenta vinculada: no ofrece la firma de invitado', () => {
    renderResolver(
      session('ADVANCED', {
        accountStatus: 'ACTIVE',
        guestSigningAllowed: false,
      }),
    );

    expect(
      screen.queryByText(/firma electrónica avanzada sin cuenta/i),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/firma desde tu cuenta/i)).toBeInTheDocument();
  });

  it('tipo no soportado: estado controlado, sin aplicar un flujo por defecto', () => {
    renderResolver(session(null));

    expect(
      screen.getByText(/tipo de firma no disponible/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/biometría/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/avanzada/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/firma desde tu cuenta/i),
    ).not.toBeInTheDocument();
  });

  it('usa el registro que se le pase', () => {
    renderWithProviders(
      <SignatureFlowResolver
        session={session('BIOMETRIC')}
        onSuccess={jest.fn()}
        onError={jest.fn()}
        registry={{ BIOMETRIC: () => <p>flujo de prueba</p> }}
      />,
    );

    expect(screen.getByText('flujo de prueba')).toBeInTheDocument();
  });
});
