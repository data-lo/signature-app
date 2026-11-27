import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, type AxiosResponse } from 'axios';
import { FileStatus } from 'filepond';

import { verifyDocumentRequest } from '../_requests';
import type { DocumentVerificationResult } from '../_schemas';
import { VerifyDocumentView } from './VerifyDocumentView';

jest.mock('../_requests', () => ({ verifyDocumentRequest: jest.fn() }));

const XML = new File(['<documentAudit />'], 'auditoria-doc-1.xml', {
  type: 'application/xml',
});
const PDF = new File(['%PDF-1.7'], 'contrato-final.pdf', {
  type: 'application/pdf',
});
const DOCX = new File(['PK'], 'contrato.docx', {
  type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
});

/**
 * FilePond necesita APIs que jsdom no tiene: se reemplaza por botones que disparan sus callbacks
 * con la secuencia real (cargando → IDLE). No aplica la validación de tipo de FilePond, así que el
 * Word llega al componente y prueba la validación propia (`verificationFileSchema`).
 */
jest.mock('react-filepond', () => ({
  registerPlugin: jest.fn(),
  FilePond: (props: {
    onupdatefiles: (items: { status: number; file: File }[]) => void;
    onaddfile: (error: unknown, item: unknown) => void;
  }) => {
    const add = (file: File) => {
      props.onupdatefiles([{ status: FileStatus.LOADING, file }]);
      props.onupdatefiles([{ status: FileStatus.IDLE, file }]);
      props.onaddfile(null, { file });
    };
    return (
      <>
        <button type="button" onClick={() => add(XML)}>
          Cargar XML
        </button>
        <button type="button" onClick={() => add(PDF)}>
          Cargar PDF
        </button>
        <button type="button" onClick={() => add(DOCX)}>
          Cargar Word
        </button>
        <button type="button" onClick={() => props.onupdatefiles([])}>
          Quitar archivo
        </button>
      </>
    );
  },
}));
jest.mock('filepond', () => ({ FileStatus: { IDLE: 2, LOADING: 7 } }));
jest.mock('filepond-plugin-file-validate-type', () => ({}));
jest.mock('filepond-plugin-file-validate-size', () => ({}));
jest.mock('filepond/dist/filepond.min.css', () => ({}));

const verifyMock = verifyDocumentRequest as jest.MockedFunction<
  typeof verifyDocumentRequest
>;

function renderView() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <VerifyDocumentView />
    </QueryClientProvider>,
  );
}

const verifyButton = () =>
  screen.getByRole('button', { name: /verificar documento|verificando/i });

function httpError(status: number) {
  return new AxiosError(
    'Request failed',
    'ERR_BAD_REQUEST',
    undefined,
    undefined,
    {
      status,
      data: { message: 'detalle interno' },
    } as AxiosResponse,
  );
}

const VALID_RESULT: DocumentVerificationResult = {
  status: 'VALID',
  fileType: 'AUDIT_XML',
  document: {
    id: 'doc-1',
    fileName: 'contrato.pdf',
    signedAt: '2026-11-19T12:00:00.000Z',
  },
  evidence: {
    verificationRecordDigest: 'a'.repeat(64),
    signedHash: 'b'.repeat(64),
    sealedAt: '2026-11-19T12:05:00.000Z',
  },
};

describe('VerifyDocumentView', () => {
  beforeEach(() => {
    verifyMock.mockReset();
  });

  it('muestra el encabezado público y el botón deshabilitado sin archivo', () => {
    renderView();

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Verifica la integridad de un documento',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Consulta pública')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Cómo funciona' }),
    ).toBeInTheDocument();
    expect(verifyButton()).toBeDisabled();
  });

  it('verifica un XML de auditoría: carga, envía sólo ese archivo y muestra el resultado', async () => {
    let resolve!: (value: DocumentVerificationResult) => void;
    verifyMock.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    renderView();

    await userEvent.click(screen.getByRole('button', { name: 'Cargar XML' }));
    expect(screen.getByText('Archivo listo para validar')).toBeInTheDocument();
    expect(verifyButton()).toBeEnabled();

    await userEvent.click(verifyButton());

    expect(verifyMock).toHaveBeenCalledTimes(1);
    expect(verifyMock.mock.calls[0][0]).toBe(XML);
    expect(
      await screen.findByText('Procesando el archivo…'),
    ).toBeInTheDocument();
    expect(verifyButton()).toBeDisabled();
    expect(verifyButton()).toHaveTextContent('Verificando…');

    resolve(VALID_RESULT);

    const result = await screen.findByRole('region', {
      name: 'Resultado de la verificación',
    });
    expect(
      within(result).getByText('Documento verificado'),
    ).toBeInTheDocument();
    expect(within(result).getByText('contrato.pdf')).toBeInTheDocument();
    expect(within(result).getByText('XML de auditoría')).toBeInTheDocument();
    expect(within(result).getByText('a'.repeat(64))).toBeInTheDocument();
    expect(
      within(result).getByRole('link', {
        name: /información pública del documento/i,
      }),
    ).toHaveAttribute('href', '/public/documents/doc-1');
    expect(
      screen.queryByText('Procesando el archivo…'),
    ).not.toBeInTheDocument();
    // Sigue en la misma página: el formulario continúa ahí.
    expect(
      screen.getByRole('heading', { name: 'Archivo a verificar' }),
    ).toBeInTheDocument();
  });

  it('verifica un PDF final', async () => {
    verifyMock.mockResolvedValue({
      ...VALID_RESULT,
      fileType: 'FINAL_PDF',
    });
    renderView();

    await userEvent.click(screen.getByRole('button', { name: 'Cargar PDF' }));
    await userEvent.click(verifyButton());

    expect(verifyMock.mock.calls[0][0]).toBe(PDF);
    expect(await screen.findByText('PDF final')).toBeInTheDocument();
  });

  it('rechaza un formato no permitido y mantiene el botón deshabilitado', async () => {
    renderView();

    await userEvent.click(screen.getByRole('button', { name: 'Cargar Word' }));

    expect(
      screen.getByText(
        'Sólo se aceptan archivos XML de auditoría (.xml) o PDF (.pdf).',
      ),
    ).toBeInTheDocument();
    expect(verifyButton()).toBeDisabled();
    expect(
      screen.queryByText('Archivo listo para validar'),
    ).not.toBeInTheDocument();
    expect(verifyMock).not.toHaveBeenCalled();
  });

  it('vuelve a deshabilitar el botón al quitar el archivo', async () => {
    renderView();

    await userEvent.click(screen.getByRole('button', { name: 'Cargar XML' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Quitar archivo' }),
    );

    expect(verifyButton()).toBeDisabled();
  });

  it('avisa del error de red con un mensaje claro', async () => {
    verifyMock.mockRejectedValue(
      new AxiosError('Network Error', 'ERR_NETWORK'),
    );
    renderView();

    await userEvent.click(screen.getByRole('button', { name: 'Cargar XML' }));
    await userEvent.click(verifyButton());

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No pudimos conectar con el servicio');
    expect(alert).toHaveTextContent(/revisa tu conexión/i);
    // Se puede reintentar.
    expect(verifyButton()).toBeEnabled();
  });

  it.each([
    [422, 'No pudimos leer el archivo'],
    [404, 'No encontramos evidencia para este archivo'],
    [413, 'El archivo es demasiado grande'],
    [500, 'No pudimos verificar el archivo'],
  ])(
    'HTTP %i muestra "%s" sin el detalle del backend',
    async (status, title) => {
      verifyMock.mockRejectedValue(httpError(status));
      renderView();

      await userEvent.click(screen.getByRole('button', { name: 'Cargar PDF' }));
      await userEvent.click(verifyButton());

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(title);
      expect(alert).not.toHaveTextContent('detalle interno');
    },
  );

  it.each([
    ['VALID', 'success', 'Documento verificado'],
    ['INVALID', 'error', 'No se pudo comprobar la integridad'],
    ['NOT_FOUND', 'warning', 'Sin evidencia registrada'],
    ['PENDING', 'warning', 'Evidencia pendiente'],
    ['ERROR', 'error', 'No se pudo procesar el archivo'],
  ] as const)('estado %s: aviso %s "%s"', async (status, variant, title) => {
    verifyMock.mockResolvedValue({ status });
    renderView();

    await userEvent.click(screen.getByRole('button', { name: 'Cargar XML' }));
    await userEvent.click(verifyButton());

    const result = await screen.findByRole('region', {
      name: 'Resultado de la verificación',
    });
    expect(result).toHaveAttribute('data-status', status);
    const alert = within(result).getByRole('status');
    expect(alert).toHaveAttribute('data-variant', variant);
    expect(alert).toHaveTextContent(title);
    // Sin documento ni evidencia, no se pintan tarjetas vacías.
    expect(
      within(result).queryByText('Documento vinculado'),
    ).not.toBeInTheDocument();
    expect(
      within(result).queryByText('Evidencia disponible'),
    ).not.toBeInTheDocument();
  });

  it('muestra el detalle del backend como complemento del estado', async () => {
    verifyMock.mockResolvedValue({
      status: 'PENDING',
      message: 'El sellado sigue en proceso.',
    });
    renderView();

    await userEvent.click(screen.getByRole('button', { name: 'Cargar XML' }));
    await userEvent.click(verifyButton());

    expect(
      await screen.findByText('El sellado sigue en proceso.'),
    ).toBeInTheDocument();
  });

  it('elegir otro archivo descarta el resultado anterior', async () => {
    verifyMock.mockResolvedValue(VALID_RESULT);
    renderView();

    await userEvent.click(screen.getByRole('button', { name: 'Cargar XML' }));
    await userEvent.click(verifyButton());
    await screen.findByText('Documento verificado');

    await userEvent.click(screen.getByRole('button', { name: 'Cargar PDF' }));

    await waitFor(() =>
      expect(
        screen.queryByText('Documento verificado'),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByText('Archivo listo para validar')).toBeInTheDocument();
  });

  it('no registra el archivo en la consola', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map(
      (method) =>
        jest.spyOn(console, method).mockImplementation(() => undefined),
    );
    verifyMock.mockRejectedValue(httpError(422));
    renderView();

    await userEvent.click(screen.getByRole('button', { name: 'Cargar XML' }));
    await userEvent.click(verifyButton());
    await screen.findByRole('alert');

    for (const spy of spies) {
      for (const args of spy.mock.calls) {
        expect(args).not.toContain(XML);
        expect(JSON.stringify(args.map(String))).not.toContain(
          'auditoria-doc-1.xml',
        );
      }
      spy.mockRestore();
    }
  });
});
