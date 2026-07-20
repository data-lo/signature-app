import { render, screen } from '@testing-library/react';
import HomeContent from './HomeContent';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type { AuthUser } from '@/lib/store/types/auth-store.types';

jest.mock('../../documents/create/_components/CreateDocumentView', () => ({
  __esModule: true,
  default: () => <div>CreateDocumentView</div>,
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

  it('bug corregido: bloquea la sección operativa si el onboarding está incompleto', () => {
    useAuthStore.setState({
      user: buildUser({
        isConfigured: false,
        personalConfigured: false,
        signatureConfigured: false,
      }),
    });
    render(<HomeContent />);

    expect(
      screen.getByText('Completa tu configuración para acceder a esta sección.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('CreateDocumentView')).not.toBeInTheDocument();
    expect(screen.queryByText('InviteMemberModal')).not.toBeInTheDocument();
  });

  it('bloquea la sección operativa si falta solo una de las dos sub-banderas', () => {
    useAuthStore.setState({
      user: buildUser({ personalConfigured: true, signatureConfigured: false }),
    });
    render(<HomeContent />);

    expect(screen.queryByText('CreateDocumentView')).not.toBeInTheDocument();
  });

  it('muestra la sección operativa cuando ambas sub-banderas están en true', () => {
    useAuthStore.setState({
      user: buildUser({ personalConfigured: true, signatureConfigured: true }),
    });
    render(<HomeContent />);

    expect(screen.getByText('CreateDocumentView')).toBeInTheDocument();
    expect(screen.getByText('InviteMemberModal')).toBeInTheDocument();
  });

  it('muestra la sección operativa cuando isConfigured ya es true (aunque las sub-banderas locales no se hayan recalculado)', () => {
    useAuthStore.setState({
      user: buildUser({
        isConfigured: true,
        personalConfigured: false,
        signatureConfigured: false,
      }),
    });
    render(<HomeContent />);

    expect(screen.getByText('CreateDocumentView')).toBeInTheDocument();
  });
});
