import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test-utils';
import CreateDocumentView from './CreateDocumentView';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useMyDocuments } from '../_hooks/useMyDocuments';
import { useCreateDocumentSignatures } from '../_hooks/useCreateDocumentSignatures';
import { useDocumentsCount } from '@/app/_components/DocumentsCountContext';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('@/lib/hooks/useCurrentUser');
jest.mock('../_hooks/useMyDocuments');
jest.mock('../_hooks/useCreateDocumentSignatures', () => ({
  ...jest.requireActual('../_hooks/useCreateDocumentSignatures'),
  useCreateDocumentSignatures: jest.fn(),
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

const mockedUseCurrentUser = useCurrentUser as jest.Mock;
const mockedUseMyDocuments = useMyDocuments as jest.Mock;
const mockedUseCreateDocumentSignatures =
  useCreateDocumentSignatures as jest.Mock;
const mockedUseDocumentsCount = useDocumentsCount as jest.Mock;

async function addSigner(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /firmante/i }));
  await user.type(screen.getByLabelText(/nombre\(s\)/i), 'Juan');
  await user.type(screen.getByLabelText(/apellido/i), 'Pérez');
  await user.type(screen.getByLabelText(/^email$/i), 'juan.perez@mail.com');
}

describe('CreateDocumentView', () => {
  const mutate = jest.fn();

  beforeEach(() => {
    mutate.mockReset();
    mockedUseCurrentUser.mockReturnValue({
      data: {
        firstName: 'Creador',
        lastName: 'Uno',
        email: 'creador@correo.com',
        rfc: 'CRUN800101ABC',
      },
    });
    mockedUseMyDocuments.mockReturnValue({ data: undefined });
    mockedUseCreateDocumentSignatures.mockReturnValue({
      mutate,
      isPending: false,
      isError: false,
      error: null,
    });
    mockedUseDocumentsCount.mockReturnValue({ setDocumentsCount: jest.fn() });
  });

  it('mantiene el botón de enviar deshabilitado sin archivo', () => {
    renderWithProviders(<CreateDocumentView />);

    expect(screen.getByRole('button', { name: /^firmar$/i })).toBeDisabled();
  });

  it('agrega un firmante SIMPLE y envía el payload con los datos correctos', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CreateDocumentView />);

    await user.click(
      screen.getByRole('button', { name: /seleccionar archivo de prueba/i }),
    );
    await addSigner(user);

    const submitButton = screen.getByRole('button', { name: /^firmar$/i });
    await user.click(submitButton);

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: 'contrato.pdf',
        requiresApproval: false,
        collaborators: [
          expect.objectContaining({
            collaboratorType: 'SIGNER',
            firstName: 'Juan',
            lastName: 'Pérez',
            email: 'juan.perez@mail.com',
            signatureType: 'SIMPLE',
          }),
        ],
      }),
      expect.anything(),
    );
  });

  it('al marcar "firma avanzada" pide RFC; sin RFC no envía el formulario', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CreateDocumentView />);

    await user.click(
      screen.getByRole('button', { name: /seleccionar archivo de prueba/i }),
    );
    await addSigner(user);

    await user.click(
      screen.getByRole('checkbox', { name: /firma avanzada/i }),
    );
    expect(screen.getByLabelText(/^rfc$/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^firmar$/i }));

    expect(mutate).not.toHaveBeenCalled();
    expect(
      screen.getByText(/el rfc es obligatorio para firma avanzada/i),
    ).toBeInTheDocument();
  });

  it('incluirme como firmante agrega al usuario en sesión sin pedir un firmante manual', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CreateDocumentView />);

    await user.click(
      screen.getByRole('button', { name: /seleccionar archivo de prueba/i }),
    );
    await user.click(
      screen.getByRole('checkbox', { name: /incluirme como firmante/i }),
    );

    expect(
      screen.getByText(/estás firmando este documento en representación de/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^firmar$/i }));

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        collaborators: [
          expect.objectContaining({
            collaboratorType: 'SIGNER',
            firstName: 'Creador',
            lastName: 'Uno',
            email: 'creador@correo.com',
          }),
        ],
      }),
      expect.anything(),
    );
  });

  it('muestra el mensaje de error del backend cuando la mutación falla', () => {
    mockedUseCreateDocumentSignatures.mockReturnValue({
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
