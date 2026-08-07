import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test-utils';
import AdvancedSignatureDialog from './AdvancedSignatureDialog';

jest.mock('./EfirmaFilePicker', () => ({
  __esModule: true,
  default: ({
    extension,
    onFileSelected,
  }: {
    extension: string;
    fileLabel: string;
    onFileSelected: (file: File | null) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        onFileSelected(
          new File(['contenido'], `archivo.${extension}`, {
            type: 'application/octet-stream',
          }),
        )
      }
    >
      {`Seleccionar archivo .${extension} de prueba`}
    </button>
  ),
}));

async function selectBothFiles(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole('button', { name: /seleccionar archivo \.key/i }),
  );
  await user.click(
    screen.getByRole('button', { name: /seleccionar archivo \.cer/i }),
  );
}

describe('AdvancedSignatureDialog', () => {
  const onOpenChange = jest.fn();
  const onSubmit = jest.fn();

  beforeEach(() => {
    onOpenChange.mockReset();
    onSubmit.mockReset();
  });

  it('muestra título, descripción y campos del formulario', () => {
    renderWithProviders(
      <AdvancedSignatureDialog
        open
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
        confirming={false}
      />,
    );

    expect(
      screen.getByText(/firma electrónica avanzada \(e\.firma\)/i),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/contraseña de la llave privada/i),
    ).toBeInTheDocument();
  });

  it('si faltan archivos, muestra un mensaje claro y no llama a onSubmit', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <AdvancedSignatureDialog
        open
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
        confirming={false}
      />,
    );

    await user.type(
      screen.getByLabelText(/contraseña de la llave privada/i),
      'MiContraseña123',
    );
    await user.click(
      screen.getByRole('button', { name: /firmar documento/i }),
    );

    expect(
      await screen.findByText(/y tu certificado \(\.cer\) para continuar/i),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('si falta la contraseña, muestra el error de validación y no llama a onSubmit', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <AdvancedSignatureDialog
        open
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
        confirming={false}
      />,
    );

    await selectBothFiles(user);
    await user.click(
      screen.getByRole('button', { name: /firmar documento/i }),
    );

    expect(
      await screen.findByText(
        /la contraseña de la llave privada es requerida/i,
      ),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('con archivos y contraseña válidos, llama a onSubmit con los valores correctos', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <AdvancedSignatureDialog
        open
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
        confirming={false}
      />,
    );

    await selectBothFiles(user);
    await user.type(
      screen.getByLabelText(/contraseña de la llave privada/i),
      'MiContraseña123',
    );
    await user.click(
      screen.getByRole('button', { name: /firmar documento/i }),
    );

    expect(onSubmit).toHaveBeenCalledWith({
      password: 'MiContraseña123',
      keyFile: expect.any(File),
      cerFile: expect.any(File),
    });
  });

  it('el botón "Cancelar" cierra el diálogo sin llamar a onSubmit', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <AdvancedSignatureDialog
        open
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
        confirming={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('mientras confirming=true, deshabilita el formulario y muestra el estado de carga (evita envíos duplicados)', () => {
    renderWithProviders(
      <AdvancedSignatureDialog
        open
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
        confirming
      />,
    );

    expect(
      screen.getByRole('button', { name: /validando y firmando/i }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeDisabled();
  });
});
