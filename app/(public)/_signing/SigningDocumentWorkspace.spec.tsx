import type { ReactNode } from 'react';
import { renderWithProviders, screen } from '@/test-utils';
import SigningDocumentWorkspace from './SigningDocumentWorkspace';
import { SigningSessionProvider } from './SigningSessionProvider';
import type { SigningSession } from './signing-session';

jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () =>
    function PdfStub({
      file,
      renderPageOverlay,
    }: {
      file: string;
      renderPageOverlay?: (pageNumber: number) => ReactNode;
    }) {
      return (
        <div>
          PDF: {file}
          <div data-testid="page-1">{renderPageOverlay?.(1)}</div>
          <div data-testid="page-2">{renderPageOverlay?.(2)}</div>
        </div>
      );
    },
}));

const SESSION: SigningSession = {
  status: 'ACTIVE',
  document: { id: 'doc-1', name: 'contrato.pdf' },
  signer: {
    collaboratorId: 'c-1',
    accountStatus: 'NONE',
    guestSigningAllowed: true,
  },
  signature: {
    type: 'ADVANCED',
    requiresEmailVerification: true,
    requiresIdentityValidation: false,
  },
  positions: [
    { page: 2, xRatio: 0.1, yRatio: 0.7, widthRatio: 0.3, heightRatio: 0.1 },
  ],
};

describe('SigningDocumentWorkspace', () => {
  it('marca las posiciones del firmante sólo en su página', () => {
    renderWithProviders(
      <SigningSessionProvider state={SESSION}>
        <SigningDocumentWorkspace fileUrl="https://minio/contrato.pdf">
          <aside>panel</aside>
        </SigningDocumentWorkspace>
      </SigningSessionProvider>,
    );

    expect(
      screen.getByText('PDF: https://minio/contrato.pdf'),
    ).toBeInTheDocument();
    expect(screen.getByText('panel')).toBeInTheDocument();
    expect(screen.getByTestId('page-1')).toBeEmptyDOMElement();
    const layer = screen.getByTestId('signature-positions-page-2');
    const box = layer.firstElementChild as HTMLElement;
    expect(box.style.left).toBe('10%');
    expect(box.style.top).toBe('70%');
    expect(box.style.width).toBe('30%');
    expect(box.style.height).toBe('10%');
  });

  it('sin proveedor (fuera de la pantalla pública) no dibuja posiciones', () => {
    renderWithProviders(
      <SigningDocumentWorkspace fileUrl="https://minio/contrato.pdf">
        <aside>panel</aside>
      </SigningDocumentWorkspace>,
    );

    expect(screen.getByTestId('page-2')).toBeEmptyDOMElement();
  });
});
