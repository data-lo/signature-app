import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileStatus } from 'filepond';
import { FormFileUpload } from './form-file-upload';

/**
 * FilePond necesita APIs de archivos y de layout que jsdom no tiene. Se reemplaza por botones que
 * disparan sus callbacks con la misma secuencia que el widget real: al agregar un archivo avisa
 * por `onupdatefiles` con el ítem todavía cargando, y después —según la validación— lo deja en
 * IDLE (vuelve a avisar por `onupdatefiles`) o lo rechaza (sólo avisa por `onaddfile` con error).
 */
const filePondProps: Record<string, unknown>[] = [];
jest.mock('react-filepond', () => ({
  registerPlugin: jest.fn(),
  FilePond: (props: {
    onupdatefiles: (items: { status: number; file: File }[]) => void;
    onaddfile: (error: unknown, item: unknown) => void;
  }) => {
    filePondProps.push(props);
    const file = new File(['%PDF'], 'contrato.pdf', { type: 'application/pdf' });
    return (
      <>
        <button
          type="button"
          onClick={() => {
            props.onupdatefiles([{ status: FileStatus.LOADING, file }]);
            props.onupdatefiles([{ status: FileStatus.IDLE, file }]);
            props.onaddfile(null, { file });
          }}
        >
          Agregar archivo válido
        </button>
        <button
          type="button"
          onClick={() => {
            props.onupdatefiles([{ status: FileStatus.LOADING, file }]);
            props.onaddfile(
              { main: 'El documento debe pesar menos de 20MB', sub: '' },
              { file },
            );
          }}
        >
          Agregar archivo demasiado grande
        </button>
      </>
    );
  },
}));
// En jsdom el build de FilePond exporta `FileStatus` vacío (no detecta un navegador compatible):
// se fijan los valores reales del enum para que IDLE y LOADING no sean ambos `undefined`.
jest.mock('filepond', () => ({ FileStatus: { IDLE: 2, LOADING: 7 } }));
jest.mock('filepond-plugin-file-validate-type', () => ({}));
jest.mock('filepond-plugin-file-validate-size', () => ({}));
jest.mock('filepond/dist/filepond.min.css', () => ({}));

function lastFilePondProps() {
  return filePondProps[filePondProps.length - 1];
}

describe('FormFileUpload', () => {
  beforeEach(() => {
    filePondProps.length = 0;
  });

  it('propaga el archivo cuando FilePond lo deja listo y cierra la carga', async () => {
    const onChange = jest.fn();
    const onLoadingChange = jest.fn();
    render(<FormFileUpload onChange={onChange} onLoadingChange={onLoadingChange} />);

    await userEvent.click(screen.getByRole('button', { name: /archivo válido/i }));

    expect(onChange).toHaveBeenLastCalledWith(expect.any(File));
    expect(onLoadingChange).toHaveBeenLastCalledWith(false);
  });

  it('bug corregido: un archivo rechazado por tamaño no deja la pantalla "cargando" para siempre', async () => {
    const onChange = jest.fn();
    const onLoadingChange = jest.fn();
    render(<FormFileUpload onChange={onChange} onLoadingChange={onLoadingChange} />);

    await userEvent.click(
      screen.getByRole('button', { name: /demasiado grande/i }),
    );

    expect(onLoadingChange).toHaveBeenNthCalledWith(1, true);
    expect(onLoadingChange).toHaveBeenLastCalledWith(false);
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('pasa el límite en bytes como cadena numérica, que FilePond lee sin reinterpretarla con base 1000', () => {
    render(<FormFileUpload onChange={jest.fn()} maxFileSize={20 * 1024 * 1024} />);

    expect(lastFilePondProps().maxFileSize).toBe('20971520');
  });

  it('sólo pasa las opciones opcionales que llegan, para no pisar los valores por omisión de FilePond', () => {
    const { rerender } = render(<FormFileUpload onChange={jest.fn()} />);

    expect(lastFilePondProps()).not.toHaveProperty('fileSizeBase');
    expect(lastFilePondProps()).not.toHaveProperty('labelMaxFileSize');
    expect(lastFilePondProps()).not.toHaveProperty(
      'fileValidateTypeLabelExpectedTypes',
    );

    rerender(
      <FormFileUpload
        onChange={jest.fn()}
        fileSizeBase={1024}
        labelMaxFileSize="El tamaño máximo es {filesize}"
        labelFileTypeExpected="Selecciona un archivo PDF"
      />,
    );

    expect(lastFilePondProps()).toMatchObject({
      fileSizeBase: 1024,
      labelMaxFileSize: 'El tamaño máximo es {filesize}',
      fileValidateTypeLabelExpectedTypes: 'Selecciona un archivo PDF',
    });
  });
});
