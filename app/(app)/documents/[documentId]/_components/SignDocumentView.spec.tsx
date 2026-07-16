import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, within } from '@/test-utils';
import SignDocumentView from './SignDocumentView';
import { useDocumentDetail } from '../_hooks/useDocumentDetail';
import { useSignDocument } from '../_hooks/useSignDocument';
import { useRejectDocument } from '../_hooks/useRejectDocument';
import { useRequestCancellation } from '../_hooks/useRequestCancellation';
import { useConfirmCancellation } from '../_hooks/useConfirmCancellation';
import type { DocumentDetail } from '../_requests';

jest.mock('../_hooks/useDocumentDetail');
jest.mock('../_hooks/useSignDocument');
jest.mock('../_hooks/useRejectDocument');
jest.mock('../_hooks/useRequestCancellation');
jest.mock('../_hooks/useConfirmCancellation');
jest.mock('../../_components/PdfPreview', () => ({
  __esModule: true,
  default: () => <div>PDF preview</div>,
}));

const mockedUseDocumentDetail = useDocumentDetail as jest.Mock;
const mockedUseSignDocument = useSignDocument as jest.Mock;
const mockedUseRejectDocument = useRejectDocument as jest.Mock;
const mockedUseRequestCancellation = useRequestCancellation as jest.Mock;
const mockedUseConfirmCancellation = useConfirmCancellation as jest.Mock;

function baseDocument(
  overrides: Partial<DocumentDetail> = {},
): DocumentDetail {
  return {
    id: 'doc-1',
    fileName: 'contrato.pdf',
    fileType: 'application/pdf',
    totalPages: 1,
    status: 'pending',
    creator: 'Creador Uno',
    secureUrl: 'https://minio/file',
    expiresIn: 3600,
    participants: [],
    myRole: 'signer',
    myStatus: 'pending',
    canSign: false,
    canReject: false,
    canRequestCancellation: false,
    canConfirmCancellation: false,
    ...overrides,
  };
}

describe('SignDocumentView', () => {
  const signMutate = jest.fn();
  const rejectMutate = jest.fn();
  const requestCancellationMutate = jest.fn();
  const confirmCancellationMutate = jest.fn();

  beforeEach(() => {
    signMutate.mockReset();
    rejectMutate.mockReset();
    requestCancellationMutate.mockReset();
    confirmCancellationMutate.mockReset();

    mockedUseSignDocument.mockReturnValue({
      mutate: signMutate,
      isPending: false,
    });
    mockedUseRejectDocument.mockReturnValue({
      mutate: rejectMutate,
      isPending: false,
    });
    mockedUseRequestCancellation.mockReturnValue({
      mutate: requestCancellationMutate,
      isPending: false,
    });
    mockedUseConfirmCancellation.mockReturnValue({
      mutate: confirmCancellationMutate,
      isPending: false,
    });
  });

  it('muestra el botón de firmar cuando es el turno del usuario', async () => {
    mockedUseDocumentDetail.mockReturnValue({
      data: baseDocument({ canSign: true, canReject: true }),
      isLoading: false,
      isError: false,
    });
    const user = userEvent.setup();
    renderWithProviders(<SignDocumentView documentId="doc-1" />);

    await user.click(
      screen.getByRole('button', { name: /continuar a firmar/i }),
    );

    expect(signMutate).toHaveBeenCalled();
  });

  it('permite rechazar con un motivo', async () => {
    mockedUseDocumentDetail.mockReturnValue({
      data: baseDocument({ canSign: true, canReject: true }),
      isLoading: false,
      isError: false,
    });
    const user = userEvent.setup();
    renderWithProviders(<SignDocumentView documentId="doc-1" />);

    await user.click(
      screen.getByRole('button', { name: /rechazar documento/i }),
    );
    await user.type(
      screen.getByPlaceholderText(/explica detalladamente/i),
      'El documento tiene un error',
    );
    await user.click(screen.getByRole('button', { name: /^rechazar$/i }));

    expect(rejectMutate).toHaveBeenCalledWith('El documento tiene un error');
  });

  it('muestra un mensaje cuando no es el turno del usuario', () => {
    mockedUseDocumentDetail.mockReturnValue({
      data: baseDocument({
        canSign: false,
        canReject: false,
        myStatus: 'pending',
      }),
      isLoading: false,
      isError: false,
    });
    renderWithProviders(<SignDocumentView documentId="doc-1" />);

    expect(
      screen.getByText(/aún no es tu turno para firmar este documento/i),
    ).toBeInTheDocument();
  });

  it('permite al creador solicitar la cancelación de un documento firmado', async () => {
    mockedUseDocumentDetail.mockReturnValue({
      data: baseDocument({
        status: 'signed',
        myRole: 'creator',
        myStatus: null,
        canRequestCancellation: true,
      }),
      isLoading: false,
      isError: false,
    });
    const user = userEvent.setup();
    renderWithProviders(<SignDocumentView documentId="doc-1" />);

    await user.click(
      screen.getByRole('button', { name: /solicitar cancelación/i }),
    );
    const dialog = await screen.findByRole('dialog');
    await user.click(
      within(dialog).getByRole('button', { name: /solicitar cancelación/i }),
    );

    expect(requestCancellationMutate).toHaveBeenCalled();
  });

  it('permite a un firmante confirmar la cancelación pendiente', async () => {
    mockedUseDocumentDetail.mockReturnValue({
      data: baseDocument({
        status: 'cancellation_pending',
        canConfirmCancellation: true,
      }),
      isLoading: false,
      isError: false,
    });
    const user = userEvent.setup();
    renderWithProviders(<SignDocumentView documentId="doc-1" />);

    await user.click(
      screen.getByRole('button', { name: /confirmar cancelación/i }),
    );
    const dialog = await screen.findByRole('dialog');
    await user.click(
      within(dialog).getByRole('button', { name: /confirmar cancelación/i }),
    );

    expect(confirmCancellationMutate).toHaveBeenCalled();
  });
});
