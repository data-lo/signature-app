import { render, screen } from '@testing-library/react';
import CreateDocumentGuard from './CreateDocumentGuard';
import { useOnboardingReady } from '@/lib/hooks/useOnboardingReady';

jest.mock('@/lib/hooks/useOnboardingReady');
jest.mock('./CreateDocumentView', () => ({
  __esModule: true,
  default: () => <div>CreateDocumentView</div>,
}));

const replace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}));

const mockedUseOnboardingReady = useOnboardingReady as jest.Mock;

describe('CreateDocumentGuard', () => {
  beforeEach(() => {
    replace.mockReset();
  });

  it('mientras el store todavía no hidrata (isLoading), no redirige ni renderiza el formulario', () => {
    mockedUseOnboardingReady.mockReturnValue({ isLoading: true, isReady: false });

    render(<CreateDocumentGuard />);

    expect(replace).not.toHaveBeenCalled();
    expect(screen.queryByText('CreateDocumentView')).not.toBeInTheDocument();
  });

  it('bug corregido: con onboarding incompleto, redirige a /home en vez de mostrar el formulario completo sin restricción', () => {
    mockedUseOnboardingReady.mockReturnValue({ isLoading: false, isReady: false });

    render(<CreateDocumentGuard />);

    expect(replace).toHaveBeenCalledWith('/home');
    expect(screen.queryByText('CreateDocumentView')).not.toBeInTheDocument();
  });

  it('con onboarding completo, renderiza CreateDocumentView sin redirigir', () => {
    mockedUseOnboardingReady.mockReturnValue({ isLoading: false, isReady: true });

    render(<CreateDocumentGuard />);

    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText('CreateDocumentView')).toBeInTheDocument();
  });
});
