import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test-utils';
import DocumentsTable, { type DocumentListItem } from './DocumentsTable';
import { useDownloadDocument } from '../_hooks/useDownloadDocument';

jest.mock('../_hooks/useDownloadDocument');
jest.mock('../[documentId]/_hooks/useDocumentDetail', () => ({
  useDocumentDetail: () => ({ data: undefined, isLoading: false, isError: false }),
}));
jest.mock('./PdfPreview', () => ({
  __esModule: true,
  default: () => <div>PDF preview</div>,
}));

const mockedUseDownloadDocument = useDownloadDocument as jest.Mock;

function buildDoc(overrides: Partial<DocumentListItem> = {}): DocumentListItem {
  return {
    id: 'doc-1',
    fileName: 'contrato.pdf',
    fileType: 'application/pdf',
    signers: ['Juan Pérez'],
    spectators: [],
    creator: 'Creador Uno',
    totalPages: 1,
    status: 'signed',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('DocumentsTable', () => {
  const downloadMutate = jest.fn();

  beforeEach(() => {
    downloadMutate.mockReset();
    mockedUseDownloadDocument.mockReturnValue({
      mutate: downloadMutate,
      isPending: false,
      variables: undefined,
    });
  });

  it('bug corregido: el botón DESCARGAR de un documento firmado dispara la descarga en vez de no hacer nada', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DocumentsTable documents={[buildDoc({ status: 'signed' })]} />);

    await user.click(screen.getByRole('button', { name: /descargar/i }));

    expect(downloadMutate).toHaveBeenCalledWith('doc-1');
  });

  it('muestra "Descargando..." y deshabilita el botón mientras la descarga de ese documento está en curso', () => {
    mockedUseDownloadDocument.mockReturnValue({
      mutate: downloadMutate,
      isPending: true,
      variables: 'doc-1',
    });
    renderWithProviders(<DocumentsTable documents={[buildDoc({ status: 'signed' })]} />);

    const button = screen.getByRole('button', { name: /descargando/i });
    expect(button).toBeDisabled();
  });

  it('no deshabilita el botón de descarga de un documento distinto al que está en curso', () => {
    mockedUseDownloadDocument.mockReturnValue({
      mutate: downloadMutate,
      isPending: true,
      variables: 'otro-doc',
    });
    renderWithProviders(<DocumentsTable documents={[buildDoc({ id: 'doc-1', status: 'signed' })]} />);

    expect(screen.getByRole('button', { name: /^descargar/i })).not.toBeDisabled();
  });

  it('para un documento pendiente muestra FIRMAR en vez de DESCARGAR', () => {
    renderWithProviders(
      <DocumentsTable
        documents={[buildDoc({ status: 'pending' })]}
        onSignClick={jest.fn()}
      />,
    );

    expect(
      screen.getByRole('button', { name: /firmar/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /descargar/i }),
    ).not.toBeInTheDocument();
  });
});
