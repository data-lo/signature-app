import { render, screen } from '@testing-library/react';
import CreateDocumentGuard from './CreateDocumentGuard';
import { useOnboardingReady } from '@/lib/hooks/useOnboardingReady';

jest.mock('@/lib/hooks/useOnboardingReady');
jest.mock('./CreateDocumentView', () => ({
  __esModule: true,
  default: ({ trackDocumentsCount }: { trackDocumentsCount?: boolean }) => (
    <div>CreateDocumentView (trackDocumentsCount={String(trackDocumentsCount)})</div>
  ),
}));
jest.mock('./OnboardingBanner', () => ({
  __esModule: true,
  default: () => <div>OnboardingBanner</div>,
}));
jest.mock('./InviteMemberModal', () => ({
  __esModule: true,
  default: () => <div>InviteMemberModal</div>,
}));

const mockedUseOnboardingReady = useOnboardingReady as jest.Mock;

describe('CreateDocumentGuard', () => {
  it('mientras el store todavía no hidrata (isLoading), no renderiza nada', () => {
    mockedUseOnboardingReady.mockReturnValue({ isLoading: true, isReady: false });

    const { container } = render(<CreateDocumentGuard />);

    expect(container).toBeEmptyDOMElement();
  });

  it('con onboarding incompleto: renderiza la vista visible pero bloqueada (inert + opacidad), sin redirigir a otra ruta', () => {
    mockedUseOnboardingReady.mockReturnValue({ isLoading: false, isReady: false });

    render(<CreateDocumentGuard />);

    expect(screen.getByText('OnboardingBanner')).toBeInTheDocument();
    const createDocumentView = screen.getByText(/CreateDocumentView/);
    expect(createDocumentView).toBeInTheDocument();

    const wrapper = createDocumentView.closest('[aria-disabled]');
    expect(wrapper).toHaveAttribute('inert');
    expect(wrapper).toHaveAttribute('aria-disabled', 'true');
    expect(wrapper?.className).toContain('opacity-50');
    expect(wrapper?.className).toContain('pointer-events-none');
    expect(
      screen.getByText('CreateDocumentView (trackDocumentsCount=false)'),
    ).toBeInTheDocument();
  });

  it('con onboarding completo: renderiza la vista habilitada (sin inert ni opacidad)', () => {
    mockedUseOnboardingReady.mockReturnValue({ isLoading: false, isReady: true });

    render(<CreateDocumentGuard />);

    const createDocumentView = screen.getByText(/CreateDocumentView/);
    const wrapper = createDocumentView.closest('[aria-disabled]');
    expect(wrapper).not.toHaveAttribute('inert');
    expect(wrapper).toHaveAttribute('aria-disabled', 'false');
    expect(
      screen.getByText('CreateDocumentView (trackDocumentsCount=true)'),
    ).toBeInTheDocument();
  });
});
