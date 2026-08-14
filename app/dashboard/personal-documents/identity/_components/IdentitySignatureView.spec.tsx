import { renderWithProviders, screen } from '@/test-utils';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import IdentitySignatureView from './IdentitySignatureView';

jest.mock('@/lib/hooks/useCurrentUser');
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

// FilePond necesita las APIs de archivos del navegador y el visor de PDF necesita canvas: ninguno
// de los dos corre en jsdom. Aquí solo importa qué documento previsualiza cada tarjeta.
jest.mock('../../_components/DocumentDropzone', () => ({
  __esModule: true,
  default: ({ id }: { id: string }) => <div>Dropzone de {id}</div>,
}));

jest.mock('../../_components/DocumentFilePreview', () => ({
  __esModule: true,
  default: ({
    label,
    source,
  }: {
    label: string;
    source: File | string | null;
  }) => (
    <div>
      Previsualización de {label}:{' '}
      {typeof source === 'string' ? source : 'vacía'}
    </div>
  ),
}));

const mockedUseCurrentUser = useCurrentUser as jest.Mock;

function mockUser(user: Record<string, unknown>) {
  mockedUseCurrentUser.mockReturnValue({
    data: { id: 'user-1', ...user },
    isLoading: false,
    isError: false,
  });
}

const INE = {
  id: 'sig-1',
  secureUrl: 'https://minio.test/ine.pdf',
  expiresIn: 60,
};
const FIRMA = {
  id: 'sig-1',
  secureUrl: 'https://minio.test/firma.png',
  expiresIn: 60,
};

describe('IdentitySignatureView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sin documentos: muestra las dos tarjetas con su previsualización vacía', () => {
    mockUser({ signature: null, officialFile: null });

    renderWithProviders(<IdentitySignatureView />);

    expect(
      screen.getByText('Previsualización de Identificación (INE): vacía'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Previsualización de Firma digital: vacía'),
    ).toBeInTheDocument();
    expect(screen.getByText('Dropzone de ineFile')).toBeInTheDocument();
    expect(screen.getByText('Dropzone de signatureFile')).toBeInTheDocument();
  });

  it('con un documento: previsualiza el guardado y deja cargar el que falta', () => {
    mockUser({ signature: null, officialFile: INE });

    renderWithProviders(<IdentitySignatureView />);

    expect(
      screen.getByText(
        'Previsualización de Identificación (INE): https://minio.test/ine.pdf',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Previsualización de Firma digital: vacía'),
    ).toBeInTheDocument();
    expect(screen.getByText('Dropzone de signatureFile')).toBeInTheDocument();
    expect(screen.queryByText('Dropzone de ineFile')).not.toBeInTheDocument();
  });

  it('con los dos documentos: previsualiza ambos y ya no ofrece cargar nada', () => {
    mockUser({ signature: FIRMA, officialFile: INE });

    renderWithProviders(<IdentitySignatureView />);

    expect(
      screen.getByText(
        'Previsualización de Identificación (INE): https://minio.test/ine.pdf',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Previsualización de Firma digital: https://minio.test/firma.png',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^Dropzone/)).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /eliminar/i })).toHaveLength(
      2,
    );
  });
});
