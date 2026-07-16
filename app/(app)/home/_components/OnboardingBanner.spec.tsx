import { render, screen } from '@testing-library/react';
import OnboardingBanner from './OnboardingBanner';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type { AuthUser } from '@/lib/store/types/auth-store.types';

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

describe('OnboardingBanner', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null });
  });

  it('no renderiza nada si no hay usuario en el store', () => {
    const { container } = render(<OnboardingBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it('no renderiza nada si el usuario ya está isConfigured', () => {
    useAuthStore.setState({
      user: buildUser({
        isConfigured: true,
        personalConfigured: false,
        signatureConfigured: false,
      }),
    });
    const { container } = render(<OnboardingBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it('no renderiza nada si ambas sub-banderas ya están en true', () => {
    useAuthStore.setState({
      user: buildUser({ personalConfigured: true, signatureConfigured: true }),
    });
    const { container } = render(<OnboardingBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it('muestra el warning y solo el link de información personal si falta ese paso', () => {
    useAuthStore.setState({
      user: buildUser({ personalConfigured: false, signatureConfigured: true }),
    });
    render(<OnboardingBanner />);

    expect(
      screen.getByText('Es requerido configurar tu usuario'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Completa tu información personal'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Configura tu firma')).not.toBeInTheDocument();
  });

  it('muestra solo el link de firma si falta ese paso', () => {
    useAuthStore.setState({
      user: buildUser({ personalConfigured: true, signatureConfigured: false }),
    });
    render(<OnboardingBanner />);

    expect(screen.getByText('Configura tu firma')).toBeInTheDocument();
    expect(
      screen.queryByText('Completa tu información personal'),
    ).not.toBeInTheDocument();
  });

  it('muestra ambos links si faltan las dos sub-banderas', () => {
    useAuthStore.setState({
      user: buildUser({
        personalConfigured: false,
        signatureConfigured: false,
      }),
    });
    render(<OnboardingBanner />);

    expect(
      screen.getByText('Completa tu información personal'),
    ).toBeInTheDocument();
    expect(screen.getByText('Configura tu firma')).toBeInTheDocument();
  });
});
