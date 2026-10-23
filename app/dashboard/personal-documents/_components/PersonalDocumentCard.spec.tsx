import { renderWithProviders, screen } from '@/test-utils';
import {
  INE_DOCUMENT,
  SIGNATURE_DOCUMENT,
} from '../_config/personal-documents.config';
import PersonalDocumentCard from './PersonalDocumentCard';

// El dropzone real monta FilePond (necesita las APIs de archivos del navegador): se reemplaza por
// un marcador, ya que aquí solo importa si la tarjeta lo ofrece o no.
jest.mock('./DocumentDropzone', () => ({
  __esModule: true,
  default: () => <div>Dropzone</div>,
}));

jest.mock('./DocumentFilePreview', () => ({
  __esModule: true,
  default: ({ source }: { source: File | string | null }) => (
    <div>
      Previsualización de{' '}
      {source === null
        ? 'nada'
        : typeof source === 'string'
          ? source
          : source.name}
    </div>
  ),
}));

describe('PersonalDocumentCard', () => {
  it('sin documento: previsualiza el archivo elegido y ofrece cargarlo', () => {
    const file = new File(['firma'], 'firma.png', { type: 'image/png' });

    renderWithProviders(
      <PersonalDocumentCard
        config={SIGNATURE_DOCUMENT}
        storedUrl={null}
        pendingFile={file}
        onFileChange={jest.fn()}
      />,
    );

    expect(
      screen.getByText('Previsualización de firma.png'),
    ).toBeInTheDocument();
    expect(screen.getByText('Dropzone')).toBeInTheDocument();
    expect(screen.getByText(SIGNATURE_DOCUMENT.hint)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /eliminar/i }),
    ).not.toBeInTheDocument();
  });

  it('sin archivo elegido: la previsualización queda vacía a la espera de uno', () => {
    renderWithProviders(
      <PersonalDocumentCard
        config={INE_DOCUMENT}
        storedUrl={null}
        onFileChange={jest.fn()}
        optional
      />,
    );

    expect(screen.getByText('Previsualización de nada')).toBeInTheDocument();
    expect(screen.getByText('(opcional)')).toBeInTheDocument();
  });

  it('documento guardado: lo previsualiza y cambia la carga por abrir y eliminar', () => {
    renderWithProviders(
      <PersonalDocumentCard
        config={INE_DOCUMENT}
        storedUrl="https://minio.test/ine.pdf"
        onDelete={jest.fn()}
      />,
    );

    expect(
      screen.getByText('Previsualización de https://minio.test/ine.pdf'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Dropzone')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /abrir/i })).toHaveAttribute(
      'href',
      'https://minio.test/ine.pdf',
    );
    expect(screen.getByRole('button', { name: /eliminar/i })).toBeEnabled();
  });

  it('mientras se elimina: bloquea el botón para no repetir la petición', () => {
    renderWithProviders(
      <PersonalDocumentCard
        config={INE_DOCUMENT}
        storedUrl="https://minio.test/ine.pdf"
        onDelete={jest.fn()}
        deleting
      />,
    );

    expect(screen.getByRole('button', { name: /eliminar/i })).toBeDisabled();
  });

  it('permite destacar la eliminación con la variante destructiva', () => {
    renderWithProviders(
      <PersonalDocumentCard
        config={SIGNATURE_DOCUMENT}
        storedUrl="https://minio.test/signature.png"
        onDelete={jest.fn()}
        deleteVariant="destructive"
      />,
    );

    expect(screen.getByRole('button', { name: /eliminar/i })).toHaveClass(
      'bg-destructive/10',
      'text-destructive',
    );
  });
});
