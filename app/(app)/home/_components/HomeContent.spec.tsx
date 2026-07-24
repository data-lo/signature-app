import { render, screen } from '@testing-library/react';
import HomeContent from './HomeContent';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type { AuthUser } from '@/lib/store/types/auth-store.types';

jest.mock('../../documents/create/_components/CreateDocumentView', () => ({
  __esModule: true,
  default: ({ trackDocumentsCount }: { trackDocumentsCount?: boolean }) => (
    <div>CreateDocumentView (trackDocumentsCount={String(trackDocumentsCount)})</div>
  ),
}));
jest.mock('./InviteMemberModal', () => ({
  __esModule: true,
  default: () => <div>InviteMemberModal</div>,
}));

function buildUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'user-1',
    email: 'juan@empresa.com',
    identificationNumber: 'PELJ850101HDFRNN08',
    name: 'Juan',
    lastName: 'Pérez',
    isConfigured: false,
    personalConfigured: false,
    signatureConfigured: false,
    ...overrides,
  };
}

describe('HomeContent', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null });
  });

  it('no renderiza nada si todavía no hay usuario en el store', () => {
    const { container } = render(<HomeContent />);

    expect(container).toBeEmptyDOMElement();
  });

  it('con onboarding incompleto: la sección se renderiza visible pero deshabilitada/opaca (ya no se oculta)', () => {
    useAuthStore.setState({
      user: buildUser({
        isConfigured: false,
        personalConfigured: false,
        signatureConfigured: false,
      }),
    });
    render(<HomeContent />);

    // Sigue visible (a diferencia del comportamiento anterior, que la ocultaba por completo).
    const createDocumentView = screen.getByText(/CreateDocumentView/);
    const inviteMemberModal = screen.getByText('InviteMemberModal');
    expect(createDocumentView).toBeInTheDocument();
    expect(inviteMemberModal).toBeInTheDocument();

    const wrapper = createDocumentView.parentElement;
    expect(wrapper).toHaveAttribute('inert');
    expect(wrapper).toHaveAttribute('aria-disabled', 'true');
    expect(wrapper?.className).toContain('opacity-50');
    expect(wrapper?.className).toContain('pointer-events-none');
  });

  it('bug corregido: con onboarding incompleto, pasa trackDocumentsCount={false} para no publicar el conteo en el badge del navbar (fuera del wrapper inert)', () => {
    useAuthStore.setState({
      user: buildUser({ personalConfigured: false, signatureConfigured: false }),
    });
    render(<HomeContent />);

    expect(
      screen.getByText('CreateDocumentView (trackDocumentsCount=false)'),
    ).toBeInTheDocument();
  });

  it('bloquea (inert + opacidad) la sección operativa si falta solo una de las dos sub-banderas', () => {
    useAuthStore.setState({
      user: buildUser({ personalConfigured: true, signatureConfigured: false }),
    });
    render(<HomeContent />);

    const wrapper = screen.getByText(/CreateDocumentView/).parentElement;
    expect(wrapper).toHaveAttribute('inert');
  });

  it('muestra la sección operativa habilitada (sin inert ni opacidad) cuando ambas sub-banderas están en true', () => {
    useAuthStore.setState({
      user: buildUser({ personalConfigured: true, signatureConfigured: true }),
    });
    render(<HomeContent />);

    const wrapper = screen.getByText(/CreateDocumentView/).parentElement;
    expect(screen.getByText(/CreateDocumentView/)).toBeInTheDocument();
    expect(screen.getByText('InviteMemberModal')).toBeInTheDocument();
    expect(wrapper).not.toHaveAttribute('inert');
    expect(wrapper).toHaveAttribute('aria-disabled', 'false');
    expect(wrapper?.className).toBe('');
    expect(
      screen.getByText('CreateDocumentView (trackDocumentsCount=true)'),
    ).toBeInTheDocument();
  });

  it('muestra la sección operativa habilitada cuando isConfigured ya es true (aunque las sub-banderas locales no se hayan recalculado)', () => {
    useAuthStore.setState({
      user: buildUser({
        isConfigured: true,
        personalConfigured: false,
        signatureConfigured: false,
      }),
    });
    render(<HomeContent />);

    const wrapper = screen.getByText(/CreateDocumentView/).parentElement;
    expect(screen.getByText(/CreateDocumentView/)).toBeInTheDocument();
    expect(wrapper).not.toHaveAttribute('inert');
  });
});
