import { renderWithProviders, screen } from '@/test-utils';
import { SignatureType } from '@/lib/enums/document';
import PublicSigningMethodRouter from './PublicSigningMethodRouter';

jest.mock('../../biometric-signature/_requests');
jest.mock('../../advanced-signature/_requests');
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
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

const INVITATION = { collaboratorId: 'c-1' };

describe('PublicSigningMethodRouter', () => {
  beforeEach(() => sessionStorage.clear());

  it('BIOMETRIC: monta el flujo biométrico, con el correo enmascarado del backend', () => {
    renderWithProviders(
      <PublicSigningMethodRouter
        documentId="doc-1"
        invitation={INVITATION}
        signatureType={SignatureType.BIOMETRIC}
        maskedEmail="a***@empresa.com"
      />,
    );

    expect(screen.getByText(/firma con biometría/i)).toBeInTheDocument();
    expect(screen.getByText('a***@empresa.com')).toBeInTheDocument();
  });

  it('FIEL: monta la Firma Avanzada sin cuenta, con el correo enmascarado del backend', () => {
    renderWithProviders(
      <PublicSigningMethodRouter
        documentId="doc-1"
        invitation={INVITATION}
        signatureType={SignatureType.Fiel}
        maskedEmail="a***@empresa.com"
      />,
    );

    expect(
      screen.getByText(/firma electrónica avanzada sin cuenta/i),
    ).toBeInTheDocument();
    expect(screen.getByText('a***@empresa.com')).toBeInTheDocument();
    expect(screen.queryByText(/biometría/i)).not.toBeInTheDocument();
  });

  it('cualquier otro tipo: no monta nada', () => {
    const { container } = renderWithProviders(
      <PublicSigningMethodRouter
        documentId="doc-1"
        invitation={INVITATION}
        signatureType={SignatureType.Simple}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
