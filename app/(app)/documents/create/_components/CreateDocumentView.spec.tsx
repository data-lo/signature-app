import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test-utils';
import CreateDocumentView from './CreateDocumentView';
import { useUsers } from '../../_hooks/useUsers';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useMyDocuments } from '../_hooks/useMyDocuments';
import { useCreateDocument } from '../_hooks/useCreateDocument';
import { useDocumentsCount } from '@/app/_components/DocumentsCountContext';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('../../_hooks/useUsers');
jest.mock('@/lib/hooks/useCurrentUser');
jest.mock('../_hooks/useMyDocuments');
jest.mock('../_hooks/useCreateDocument', () => ({
  ...jest.requireActual('../_hooks/useCreateDocument'),
  useCreateDocument: jest.fn(),
}));
jest.mock('@/app/_components/DocumentsCountContext');
jest.mock('./DocumentFilePicker', () => ({
  __esModule: true,
  default: ({ onFileSelected }: { onFileSelected: (f: File) => void }) => (
    <button
      type="button"
      onClick={() =>
        onFileSelected(
          new File(['contenido'], 'contrato.pdf', {
            type: 'application/pdf',
          }),
        )
      }
    >
      Seleccionar archivo de prueba
    </button>
  ),
}));
jest.mock('../../_components/PdfPreview', () => ({
  __esModule: true,
  default: () => <div>PDF preview</div>,
}));

const mockedUseUsers = useUsers as jest.Mock;
const mockedUseCurrentUser = useCurrentUser as jest.Mock;
const mockedUseMyDocuments = useMyDocuments as jest.Mock;
const mockedUseCreateDocument = useCreateDocument as jest.Mock;
const mockedUseDocumentsCount = useDocumentsCount as jest.Mock;

const USERS = [
  { id: '11111111-1111-4111-8111-111111111111', firstName: 'Ana', lastName: 'Gómez', email: 'ana@correo.com' },
  { id: '22222222-2222-4222-8222-222222222222', firstName: 'Luis', lastName: 'Ruiz', email: 'luis@correo.com' },
];

describe('CreateDocumentView', () => {
  const mutate = jest.fn();

  beforeEach(() => {
    mutate.mockReset();
    mockedUseUsers.mockReturnValue({ data: USERS });
    mockedUseCurrentUser.mockReturnValue({
      data: { email: 'creador@correo.com' },
    });
    mockedUseMyDocuments.mockReturnValue({ data: undefined });
    mockedUseCreateDocument.mockReturnValue({
      mutate,
      isPending: false,
      isError: false,
      error: null,
    });
    mockedUseDocumentsCount.mockReturnValue({ setDocumentsCount: jest.fn() });
  });

  it('mantiene el botón de enviar deshabilitado sin archivo ni firmantes', () => {
    renderWithProviders(<CreateDocumentView />);

    expect(screen.getByRole('button', { name: /^firmar$/i })).toBeDisabled();
  });

  it('habilita el envío y llama a la mutación con el archivo y el firmante elegido', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CreateDocumentView />);

    await user.click(
      screen.getByRole('button', { name: /seleccionar archivo de prueba/i }),
    );

    // El trigger de "Firmantes" es el primer combobox (el Label no está
    // asociado programáticamente al SelectTrigger de ParticipantPicker).
    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(await screen.findByRole('option', { name: /ana gómez/i }));

    const submitButton = screen.getByRole('button', { name: /^firmar$/i });
    expect(submitButton).toBeEnabled();
    await user.click(submitButton);

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        signerIds: ['11111111-1111-4111-8111-111111111111'],
        spectatorIds: [],
      }),
    );
  });

  it('muestra el mensaje de error del backend cuando la mutación falla', () => {
    mockedUseCreateDocument.mockReturnValue({
      mutate,
      isPending: false,
      isError: true,
      error: {
        response: { data: { message: 'Ya tienes un documento con ese nombre' } },
      },
    });
    renderWithProviders(<CreateDocumentView />);

    expect(
      screen.getByText(/ya tienes un documento con ese nombre/i),
    ).toBeInTheDocument();
  });
});
