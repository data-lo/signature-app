import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test-utils';
import CreateDocumentView from './CreateDocumentView';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useDocuments } from '../../_hooks/useDocuments';
import { useCreateDocumentSignatures } from '../_hooks/useCreateDocumentSignatures';
import { useDocumentsCount } from '@/app/_components/DocumentsCountContext';
import { MISSING_FILE_MESSAGE } from '../_section-rules';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('@/lib/hooks/useCurrentUser');
jest.mock('../../_hooks/useDocuments');
jest.mock('../_hooks/useCreateDocumentSignatures', () => ({
  ...jest.requireActual('../_hooks/useCreateDocumentSignatures'),
  useCreateDocumentSignatures: jest.fn(),
}));
jest.mock('@/app/_components/DocumentsCountContext');
// El selector real monta FilePond (que necesita APIs de archivos del navegador): se reemplaza por
// dos botones que disparan los mismos callbacks — archivo listo y archivo procesándose.
jest.mock('./DocumentFilePicker', () => ({
  __esModule: true,
  default: ({
    onFileSelected,
    onLoadingChange,
  }: {
    onFileSelected: (file: File) => void;
    onLoadingChange: (isLoading: boolean) => void;
  }) => (
    <>
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
      <button type="button" onClick={() => onLoadingChange(true)}>
        Simular archivo procesándose
      </button>
    </>
  ),
}));
jest.mock('./SignaturePlacementField', () => ({
  __esModule: true,
  default: () => <div>Panel de ubicación de firmas</div>,
}));

const mockedUseCurrentUser = useCurrentUser as jest.Mock;
const mockedUseDocuments = useDocuments as jest.Mock;
const mockedUseCreateDocumentSignatures =
  useCreateDocumentSignatures as jest.Mock;
const mockedUseDocumentsCount = useDocumentsCount as jest.Mock;

function selectFile(user: ReturnType<typeof userEvent.setup>) {
  return user.click(
    screen.getByRole('button', { name: /seleccionar archivo de prueba/i }),
  );
}

async function openSection(
  user: ReturnType<typeof userEvent.setup>,
  name: RegExp,
) {
  const sectionTrigger = screen.getByRole('button', { name });
  if (sectionTrigger.getAttribute('aria-expanded') === 'false') {
    await user.click(sectionTrigger);
  }
}

async function addSigner(user: ReturnType<typeof userEvent.setup>) {
  await openSection(user, /añadir participantes/i);
  await user.click(screen.getByRole('button', { name: /firmante/i }));
  await user.type(screen.getByLabelText(/nombre\(s\)/i), 'Juan');
  await user.type(screen.getByLabelText(/apellido/i), 'Pérez');
  await user.type(screen.getByLabelText(/^email/i), 'juan.perez@mail.com');
}

/**
 * jsdom no dispara los PointerEvent que @base-ui/react usa para abrir el Select con click; el
 * teclado (Enter abre, click en la opción cierra y selecciona) sí dispara los mismos handlers
 * (mismo camino que usa `InviteMemberModal.spec.tsx`).
 */
async function selectSignatureType(
  user: ReturnType<typeof userEvent.setup>,
  optionName: RegExp,
) {
  await openSection(user, /configurar firma/i);
  screen.getByRole('combobox', { name: /tipo de firma/i }).focus();
  await user.keyboard('{Enter}');
  await user.click(screen.getByRole('option', { name: optionName }));
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
    mockedUseDocuments.mockReturnValue({ data: undefined });
    mockedUseCreateDocumentSignatures.mockReturnValue({
      mutate,
      isPending: false,
      isError: false,
      error: null,
    });
    mockedUseDocumentsCount.mockReturnValue({ setDocumentsCount: jest.fn() });
  });

  describe('activación de secciones', () => {
    it('sin archivo: el envío está deshabilitado y la sección de ubicación de firmas explica qué falta', () => {
      renderWithProviders(<CreateDocumentView />);

      expect(screen.getByRole('button', { name: /enviar solicitud de firma/i })).toBeDisabled();
      expect(screen.getByText(MISSING_FILE_MESSAGE)).toBeInTheDocument();
      expect(
        screen.queryByText(/panel de ubicación de firmas/i),
      ).not.toBeInTheDocument();
    });

    it('con el archivo cargado: se habilita la sección de ubicación de firmas (el envío además exige un firmante)', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateDocumentView />);

      await selectFile(user);

      expect(screen.getByRole('button', { name: /enviar solicitud de firma/i })).toBeDisabled();
      await waitFor(() =>
        expect(
          screen.getByText(/panel de ubicación de firmas/i),
        ).toBeInTheDocument(),
      );
      expect(screen.queryByText(MISSING_FILE_MESSAGE)).not.toBeInTheDocument();

      await addSigner(user);
      await selectSignatureType(user, /firma simple/i);

      expect(screen.getByRole('button', { name: /enviar solicitud de firma/i })).toBeEnabled();
    });

    it('mientras el archivo se procesa: no se puede enviar y la ubicación de firmas muestra el estado de carga', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateDocumentView />);

      await selectFile(user);
      await addSigner(user);
      await openSection(user, /cargar documento/i);
      await user.click(
        screen.getByRole('button', { name: /simular archivo procesándose/i }),
      );

      expect(screen.getByRole('button', { name: /enviar solicitud de firma/i })).toBeDisabled();
      expect(screen.getByText(/cargando documento/i)).toBeInTheDocument();
    });

    it('las secciones de configuración y participantes no dependen del archivo: se pueden llenar antes de cargarlo', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateDocumentView />);

      await openSection(user, /añadir participantes/i);
      await user.click(screen.getByRole('button', { name: /firmante/i }));

      expect(screen.getByLabelText(/nombre\(s\)/i)).toBeEnabled();
      expect(
        screen.getByRole('checkbox', { name: /incluirme como firmante/i }),
      ).toBeEnabled();
    });

    it('con showCreatedDocuments={false}, la sección de documentos creados no se renderiza', () => {
      mockedUseDocuments.mockReturnValue({
        data: { documents: [], meta: { total: 0 } },
      });

      renderWithProviders(<CreateDocumentView showCreatedDocuments={false} />);

      expect(
        screen.queryByRole('button', { name: /filtrar/i }),
      ).not.toBeInTheDocument();
    });
  });

  /**
   * Historia "Solicitud de firma con acordeones independientes y resumen fijo": las tres
   * secciones se abren y editan en cualquier momento (ninguna se bloquea por el estado de las
   * otras), el encabezado resume lo que contiene cuando está contraído, y el resumen + el botón
   * viven fijos debajo.
   */
  describe('acordeones', () => {
    function trigger(name: RegExp) {
      return screen.getByRole('button', { name });
    }

    it('arranca solo con cargar documento abierto y al abrir otro cierra el anterior', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateDocumentView />);

      expect(
        screen.getByRole('button', { name: /seleccionar archivo de prueba/i }),
      ).toBeVisible();
      expect(
        screen.queryByRole('combobox', { name: /tipo de firma/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /^firmante$/i }),
      ).not.toBeInTheDocument();

      // Contraída, la sección deja de ser alcanzable (el panel queda `hidden`, no solo atenuado).
      await user.click(trigger(/cargar documento/i));
      expect(
        screen.queryByRole('button', { name: /seleccionar archivo de prueba/i }),
      ).not.toBeInTheDocument();
      await user.click(trigger(/cargar documento/i));
      expect(
        screen.getByRole('button', { name: /seleccionar archivo de prueba/i }),
      ).toBeVisible();

      await user.click(trigger(/configurar firma/i));
      expect(
        screen.queryByRole('button', { name: /seleccionar archivo de prueba/i }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /tipo de firma/i })).toBeVisible();

      await user.click(trigger(/añadir participantes/i));
      expect(
        screen.queryByRole('combobox', { name: /tipo de firma/i }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^firmante$/i })).toBeVisible();
    });

    /**
     * El interruptor gobierna las manijas de arrastre y la numeración de la lista de
     * participantes, así que vive en ese acordeón: desde configuración el usuario activaba algo
     * cuyo efecto estaba en otro paso y no podía ver.
     */
    it('"Requiere firmas en orden" está en participantes, no en configurar firma', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateDocumentView />);

      await user.click(trigger(/configurar firma/i));
      expect(
        screen.queryByRole('switch', { name: /requiere firmas en orden/i }),
      ).not.toBeInTheDocument();

      await user.click(trigger(/añadir participantes/i));
      expect(
        screen.getByRole('switch', { name: /requiere firmas en orden/i }),
      ).toBeVisible();
    });

    it('ilumina en verde el círculo de cada sección cuando queda configurada', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateDocumentView />);

      // Hasta que se elija una opción, la configuración no cuenta como completa.
      expect(
        trigger(/configurar firma/i).querySelector('[data-complete="true"]'),
      ).toBeNull();
      expect(
        trigger(/cargar documento/i).querySelector('[data-complete="true"]'),
      ).toBeNull();
      expect(
        trigger(/añadir participantes/i).querySelector('[data-complete="true"]'),
      ).toBeNull();

      await selectFile(user);
      await user.click(trigger(/añadir participantes/i));
      await addSigner(user);
      await selectSignatureType(user, /firma simple/i);

      expect(
        trigger(/cargar documento/i).querySelector('[data-complete="true"]'),
      ).toHaveTextContent('1');
      expect(
        trigger(/añadir participantes/i).querySelector('[data-complete="true"]'),
      ).toHaveTextContent('3');
    });

    it('el encabezado contraído resume lo que contiene la sección', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateDocumentView />);

      await selectFile(user);
      await addSigner(user);
      await user.click(screen.getByRole('button', { name: /espectador/i }));
      await selectSignatureType(user, /firma simple/i);

      // Cada encabezado muestra su resumen al abrir otro, porque solo un panel queda expandido.
      await user.click(trigger(/cargar documento/i));
      expect(trigger(/añadir participantes/i)).toHaveTextContent(
        '1 firmante · 1 espectador',
      );

      await user.click(trigger(/configurar firma/i));
      expect(trigger(/cargar documento/i)).toHaveTextContent('contrato.pdf');

      await user.click(trigger(/añadir participantes/i));
      expect(trigger(/configurar firma/i)).toHaveTextContent('Firma Simple');
      /*
       * El panel recién abierto permanece disponible para continuar editando participantes.
       */
      expect(trigger(/añadir participantes/i)).toHaveTextContent(
        'Añadir participantes',
      );
    });

    it('el resumen fijo se actualiza al cambiar documento, configuración y participantes', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateDocumentView />);

      const summary = screen.getByRole('region', {
        name: /resumen de la solicitud/i,
      });

      expect(summary).toHaveTextContent(/documento\s*Pendiente/i);
      expect(summary).toHaveTextContent(/páginas\s*Pendiente/i);
      expect(summary).toHaveTextContent(/firmantes\s*Pendiente/i);
      expect(summary).toHaveTextContent(/espectadores\s*0 espectadores/i);

      await selectFile(user);
      await addSigner(user);
      await selectSignatureType(user, /firma electrónica avanzada/i);

      expect(summary).toHaveTextContent('contrato.pdf');
      expect(summary).toHaveTextContent('1 firmante');
      expect(summary).toHaveTextContent('Firma Electrónica Avanzada (e.firma)');
    });

    it('el resumen y el botón siguen visibles aunque las tres secciones estén contraídas', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateDocumentView />);

      await user.click(trigger(/cargar documento/i));
      await user.click(trigger(/configurar firma/i));
      await user.click(trigger(/añadir participantes/i));

      expect(
        screen.getByRole('region', { name: /resumen de la solicitud/i }),
      ).toBeVisible();
      expect(screen.getByRole('button', { name: /enviar solicitud de firma/i })).toBeVisible();
    });
  });

  describe('carga de datos', () => {
    it('por defecto (trackDocumentsCount omitido), publica el conteo de documentos en el contexto global', () => {
      const setDocumentsCount = jest.fn();
      mockedUseDocumentsCount.mockReturnValue({ setDocumentsCount });
      mockedUseDocuments.mockReturnValue({
        data: { documents: [], meta: { total: 3 } },
      });

      renderWithProviders(<CreateDocumentView />);

      expect(setDocumentsCount).toHaveBeenCalledWith(3);
    });

    it('bug corregido: con trackDocumentsCount={false} (sección deshabilitada por onboarding incompleto), no publica el conteo — evita que el badge "DOCUMENTOS:N" del navbar quede clickeable', () => {
      const setDocumentsCount = jest.fn();
      mockedUseDocumentsCount.mockReturnValue({ setDocumentsCount });
      mockedUseDocuments.mockReturnValue({
        data: { documents: [], meta: { total: 3 } },
      });

      renderWithProviders(<CreateDocumentView trackDocumentsCount={false} />);

      expect(setDocumentsCount).not.toHaveBeenCalled();
    });
  });

  describe('envío', () => {
    it('abre participantes y muestra los errores si se intenta firmar con un participante incompleto', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateDocumentView />);

      await selectFile(user);
      await selectSignatureType(user, /firma simple/i);
      await openSection(user, /añadir participantes/i);
      await user.click(screen.getByRole('button', { name: /^firmante$/i }));

      await user.click(screen.getByRole('button', { name: /enviar solicitud de firma/i }));

      expect(screen.getByLabelText(/nombre\(s\)/i)).toBeVisible();
      expect(
        screen.getByText('Ingresa el nombre del participante.'),
      ).toBeInTheDocument();
    });

    it('agrega un firmante y envía el payload con firma simple', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateDocumentView />);

      await selectFile(user);
      await addSigner(user);
      await selectSignatureType(user, /firma simple/i);

      await user.click(screen.getByRole('button', { name: /enviar solicitud de firma/i }));

      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: 'contrato.pdf',
          requiresApproval: false,
          signatureType: 'SIMPLE',
          collaborators: [
            expect.objectContaining({
              collaboratorType: 'SIGNER',
              firstName: 'Juan',
              lastName: 'Pérez',
              email: 'juan.perez@mail.com',
            }),
          ],
        }),
        expect.anything(),
      );
    });

    it('historia "Selección de tipo de firma": al elegir e.firma, el tipo viaja una sola vez para todo el documento', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateDocumentView />);

      await selectFile(user);
      await addSigner(user);
      await selectSignatureType(user, /firma electrónica avanzada/i);

      await user.click(screen.getByRole('button', { name: /enviar solicitud de firma/i }));

      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({ signatureType: 'ADVANCED' }),
        expect.anything(),
      );
    });

    /**
     * Historia "Mostrar la etiqueta correcta del tipo de firma seleccionado": el trigger mostraba
     * el valor interno de la opción ("ADVANCED") en vez de su texto legible. Se afirma sobre las
     * dos caras del mismo hecho — lo que se ve y lo que se envía — porque la etiqueta es solo
     * presentación: si el formulario empezara a guardar el texto legible, el backend recibiría un
     * tipo de firma que no existe.
     */
    it('historia "Etiqueta del tipo de firma": el selector muestra el texto legible y sigue enviando el valor interno', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateDocumentView />);

      await selectFile(user);
      await addSigner(user);
      await selectSignatureType(user, /firma electrónica avanzada/i);

      const trigger = screen.getByRole('combobox', { name: /tipo de firma/i });
      expect(trigger).toHaveTextContent('Firma Electrónica Avanzada (e.firma)');
      expect(trigger).not.toHaveTextContent('ADVANCED');

      await user.click(screen.getByRole('button', { name: /enviar solicitud de firma/i }));

      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({ signatureType: 'ADVANCED' }),
        expect.anything(),
      );
    });

    it('incluirme como firmante agrega al usuario en sesión sin pedir un firmante manual', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateDocumentView />);

      await selectFile(user);
      await openSection(user, /añadir participantes/i);
      await user.click(
        screen.getByRole('checkbox', { name: /incluirme como firmante/i }),
      );
      await selectSignatureType(user, /firma simple/i);

      expect(
        screen.getByText(/firmarás este documento con tu perfil personal/i),
      ).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /enviar solicitud de firma/i }));

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

    /**
     * La confirmación dejó de ser un toast: el envío cierra un flujo largo y su confirmación
     * trae datos que el usuario necesita retener (el aviso por correo y dónde seguir el estado),
     * así que ahora es un AlertDialog que hay que reconocer y no algo que se desvanece solo.
     */
    it('tras un envío exitoso, confirma con un diálogo que explica el correo y dónde seguir el estado', async () => {
      const mutateWithSuccess = jest.fn((_vars, opts) => opts?.onSuccess?.());
      mockedUseCreateDocumentSignatures.mockReturnValue({
        mutate: mutateWithSuccess,
        isPending: false,
        isError: false,
        error: null,
      });
      const user = userEvent.setup();
      renderWithProviders(<CreateDocumentView />);

      await selectFile(user);
      await addSigner(user);
      await selectSignatureType(user, /firma simple/i);
      await user.click(screen.getByRole('button', { name: /enviar solicitud de firma/i }));

      const dialog = await screen.findByRole('alertdialog');
      expect(dialog).toHaveTextContent(/solicitud de firma enviada/i);
      expect(dialog).toHaveTextContent(
        /tu solicitud de firma se envió correctamente/i,
      );
      expect(dialog).toHaveTextContent(
        /te notificaremos por correo cuando el proceso finalice/i,
      );

      // Manda a la sección real donde el creador ve lo que envió, con el mismo nombre que usa
      // el sidebar (ver DOCUMENTS_SECTIONS).
      await user.click(screen.getByRole('button', { name: /entendido/i }));
      await waitFor(() =>
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument(),
      );
    });

    it('no muestra la confirmación mientras el envío no haya salido bien', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateDocumentView />);

      await selectFile(user);
      await addSigner(user);
      await selectSignatureType(user, /firma simple/i);
      await user.click(screen.getByRole('button', { name: /enviar solicitud de firma/i }));

      expect(mutate).toHaveBeenCalled();
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('mientras la mutación está pendiente, el botón se deshabilita y muestra el progreso', () => {
      mockedUseCreateDocumentSignatures.mockReturnValue({
        mutate,
        isPending: true,
        isError: false,
        error: null,
      });

      renderWithProviders(<CreateDocumentView />);

      expect(
        screen.getByRole('button', { name: /enviando solicitud/i }),
      ).toBeDisabled();
    });
  });

  describe('tipo de firma', () => {
    it('el firmante ya no elige su propio tipo de firma: el checkbox por firmante desapareció', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateDocumentView />);

      await addSigner(user);

      expect(
        screen.queryByRole('checkbox', { name: /firma avanzada/i }),
      ).not.toBeInTheDocument();
    });

    it('el flujo de firma avanzada no pide RFC y muestra el 2FA en la configuración del documento', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateDocumentView />);

      await addSigner(user);
      // Con firma simple: sin RFC y sin control de 2FA (se fuerza a true de forma oculta).
      expect(screen.queryByLabelText(/^rfc/i)).not.toBeInTheDocument();
      expect(
        screen.queryByRole('checkbox', { name: /código de verificación/i }),
      ).not.toBeInTheDocument();

      await selectSignatureType(user, /firma electrónica avanzada/i);
      await openSection(user, /configurar firma/i);

      expect(screen.queryByLabelText(/^rfc/i)).not.toBeInTheDocument();
      expect(
        screen.getByRole('checkbox', { name: /código de verificación/i }),
      ).toBeInTheDocument();
    });

    it('el espectador sigue siendo el único participante al que se le pide RFC', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateDocumentView />);

      await openSection(user, /añadir participantes/i);
      await user.click(screen.getByRole('button', { name: /espectador/i }));

      expect(screen.getByLabelText(/^rfc/i)).toBeInTheDocument();
    });
  });

  describe('validaciones y errores', () => {
    it('sin ningún firmante el envío queda deshabilitado, así que no hay forma de mandar la solicitud incompleta', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateDocumentView />);

      await selectFile(user);
      await user.click(screen.getByRole('button', { name: /enviar solicitud de firma/i }));

      expect(screen.getByRole('button', { name: /enviar solicitud de firma/i })).toBeDisabled();
      expect(mutate).not.toHaveBeenCalled();
    });

    it('muestra el mensaje de error del backend cuando la mutación falla', () => {
      mockedUseCreateDocumentSignatures.mockReturnValue({
        mutate,
        isPending: false,
        isError: true,
        error: {
          response: {
            data: { message: 'Ya tienes un documento con ese nombre' },
          },
        },
      });

      renderWithProviders(<CreateDocumentView />);

      expect(
        screen.getByText(/ya tienes un documento con ese nombre/i),
      ).toBeInTheDocument();
    });

    it('muestra el error del listado de documentos creados sin romper el formulario', () => {
      mockedUseDocuments.mockReturnValue({
        data: undefined,
        isError: true,
        error: { response: { data: { message: 'Servicio no disponible' } } },
      });

      renderWithProviders(<CreateDocumentView />);

      expect(screen.getByText(/servicio no disponible/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /enviar solicitud de firma/i })).toBeInTheDocument();
    });
  });
});
