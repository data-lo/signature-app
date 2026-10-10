import { useForm } from 'react-hook-form';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test-utils';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import CollaboratorsFieldArray from './CollaboratorsFieldArray';
import IncludeMeAsSignerField from './IncludeMeAsSignerField';
import {
  emptySigner,
  type CreateDocumentSignaturesFormValues,
} from '../_schemas';
import {
  searchDirectoryContactsRequest,
  type DirectoryContact,
} from '../_requests';

jest.mock('@/lib/hooks/useCurrentUser');
jest.mock('../_requests', () => ({
  ...jest.requireActual('../_requests'),
  searchDirectoryContactsRequest: jest.fn(),
}));

const mockedSearchDirectory = searchDirectoryContactsRequest as jest.Mock;

const mockedUseCurrentUser = useCurrentUser as jest.MockedFunction<
  typeof useCurrentUser
>;

const CURRENT_USER = {
  firstName: 'Creador',
  lastName: 'Uno',
  email: 'creador@correo.com',
};

function signers(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    ...emptySigner(),
    firstName: `Firmante${i}`,
    lastName: 'Apellido',
    email: `firmante${i}@correo.com`,
  }));
}

function Harness({
  signerCount,
  requiresOrder,
}: {
  signerCount: number;
  requiresOrder: boolean;
}) {
  const { control } = useForm<CreateDocumentSignaturesFormValues>({
    defaultValues: {
      requiresApproval: false,
      includeMeAsSigner: false,
      requiresOrder,
      collaborators: signers(signerCount),
    },
  });

  return <CollaboratorsFieldArray control={control} />;
}

/**
 * Monta la lista JUNTO al checkbox real, no con un booleano simulado: la historia es justamente
 * que marcar y desmarcar la opción cree y elimine la tarjeta, así que la prueba tiene que pasar
 * por el mismo control que usa la pantalla.
 */
function SelfSignerHarness({
  initialCollaborators = [],
}: {
  initialCollaborators?: CreateDocumentSignaturesFormValues['collaborators'];
}) {
  const { control } = useForm<CreateDocumentSignaturesFormValues>({
    defaultValues: {
      signatureType: 'SIMPLE',
      requiresApproval: false,
      includeMeAsSigner: false,
      requiresOrder: false,
      collaborators: initialCollaborators,
    },
  });

  return (
    <>
      <CollaboratorsFieldArray control={control} />
      <IncludeMeAsSignerField control={control} />
    </>
  );
}

const includeMeCheckbox = () =>
  screen.getByRole('checkbox', { name: /incluirme como firmante/i });

/** Las tarjetas propias se distinguen por su insignia "Tú" (ver `CollaboratorFormItem`). */
const selfCards = () => screen.queryAllByText('Tú');

beforeEach(() => {
  mockedUseCurrentUser.mockReturnValue({
    data: CURRENT_USER,
  } as ReturnType<typeof useCurrentUser>);
});

describe('CollaboratorsFieldArray', () => {
  it('con requiresOrder activo y 2 firmantes: muestra drag handles y el índice de posición', () => {
    renderWithProviders(<Harness signerCount={2} requiresOrder />);

    expect(
      screen.getAllByRole('button', { name: /arrastrar para reordenar/i }),
    ).toHaveLength(2);
    expect(screen.getByLabelText('Posición 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Posición 2')).toBeInTheDocument();
  });

  it('con requiresOrder activo pero solo 1 firmante: no muestra drag handles ni índice (lista estándar)', () => {
    renderWithProviders(<Harness signerCount={1} requiresOrder />);

    expect(
      screen.queryByRole('button', { name: /arrastrar para reordenar/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Posición \d+$/)).not.toBeInTheDocument();
  });

  it('con 2 firmantes pero requiresOrder inactivo: no muestra drag handles ni índice (lista estándar)', () => {
    renderWithProviders(<Harness signerCount={2} requiresOrder={false} />);

    expect(
      screen.queryByRole('button', { name: /arrastrar para reordenar/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Posición \d+$/)).not.toBeInTheDocument();
  });
});

/**
 * Historia "Crear y eliminar automáticamente el participante Usuario firmante": marcar la opción
 * tiene que producir la tarjeta en el momento —antes solo se agregaba al enviar, así que el
 * usuario marcaba y no veía nada— y desmarcarla tiene que quitarla.
 */
describe('CollaboratorsFieldArray · "Incluirme como firmante"', () => {
  it('al marcar la opción, agrega la tarjeta del usuario en sesión con sus datos', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SelfSignerHarness />);

    expect(selfCards()).toHaveLength(0);

    await user.click(includeMeCheckbox());

    await waitFor(() => expect(selfCards()).toHaveLength(1));
    expect(screen.getByDisplayValue('Creador')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Uno')).toBeInTheDocument();
    expect(screen.getByDisplayValue('creador@correo.com')).toBeInTheDocument();
  });

  it('la tarjeta propia se muestra en solo lectura: sus datos vienen del perfil', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SelfSignerHarness />);

    await user.click(includeMeCheckbox());

    await waitFor(() =>
      expect(screen.getByDisplayValue('creador@correo.com')).toBeDisabled(),
    );
    expect(screen.getByDisplayValue('Creador')).toBeDisabled();
  });

  it('al desmarcar la opción, elimina la tarjeta', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SelfSignerHarness />);

    await user.click(includeMeCheckbox());
    await waitFor(() => expect(selfCards()).toHaveLength(1));

    await user.click(includeMeCheckbox());

    await waitFor(() => expect(selfCards()).toHaveLength(0));
    expect(screen.queryByDisplayValue('creador@correo.com')).toBeNull();
  });

  it('marcar y desmarcar varias veces no acumula tarjetas duplicadas', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SelfSignerHarness />);

    for (let round = 0; round < 3; round += 1) {
      await user.click(includeMeCheckbox());
      await waitFor(() => expect(selfCards()).toHaveLength(1));
      await user.click(includeMeCheckbox());
      await waitFor(() => expect(selfCards()).toHaveLength(0));
    }

    await user.click(includeMeCheckbox());

    await waitFor(() => expect(selfCards()).toHaveLength(1));
  });

  it('no toca a los participantes capturados a mano', async () => {
    const user = userEvent.setup();
    const manual = {
      ...emptySigner(),
      firstName: 'Manual',
      lastName: 'Apellido',
      email: 'manual@correo.com',
    };
    renderWithProviders(<SelfSignerHarness initialCollaborators={[manual]} />);

    await user.click(includeMeCheckbox());
    await waitFor(() => expect(selfCards()).toHaveLength(1));
    expect(screen.getByDisplayValue('manual@correo.com')).toBeInTheDocument();

    await user.click(includeMeCheckbox());

    await waitFor(() => expect(selfCards()).toHaveLength(0));
    expect(screen.getByDisplayValue('manual@correo.com')).toBeInTheDocument();
  });

  // Sin esto el botón se sentiría roto: al quitar solo la tarjeta, el checkbox seguiría marcado y
  // el efecto la volvería a agregar en el render siguiente.
  it('quitar la tarjeta con su botón de cerrar también desmarca la opción', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SelfSignerHarness />);

    await user.click(includeMeCheckbox());
    await waitFor(() => expect(selfCards()).toHaveLength(1));

    await user.click(
      screen.getByRole('button', { name: /quitarme como firmante/i }),
    );

    await waitFor(() => expect(selfCards()).toHaveLength(0));
    expect(includeMeCheckbox()).not.toBeChecked();
  });

  it('con el perfil aún sin cargar, marcar la opción no agrega una tarjeta vacía', async () => {
    mockedUseCurrentUser.mockReturnValue({
      data: undefined,
    } as ReturnType<typeof useCurrentUser>);
    const user = userEvent.setup();
    renderWithProviders(<SelfSignerHarness />);

    await user.click(includeMeCheckbox());

    await waitFor(() => expect(includeMeCheckbox()).toBeChecked());
    expect(selfCards()).toHaveLength(0);
  });
});

/**
 * Historia "Crear componentes UI para selección y alta de contactos desde Directorio": sólo
 * interfaz. El botón abre el modal y cada tarjeta capturada a mano trae su checkbox.
 */
describe('CollaboratorsFieldArray · Directorio', () => {
  const addToDirectoryCheckboxes = () =>
    screen.queryAllByRole('checkbox', { name: /agregar al directorio/i });

  it('muestra el botón Directorio junto a Firmante y Testigo', () => {
    renderWithProviders(<Harness signerCount={0} requiresOrder={false} />);

    for (const name of ['Firmante', 'Testigo', 'Directorio']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
  });

  it('al hacer clic en Directorio abre el modal', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness signerCount={0} requiresOrder={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Directorio' }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByRole('searchbox', { name: /buscar contacto/i }),
    ).toBeInTheDocument();
  });

  it('cada tarjeta de firmante y de testigo trae "Agregar al directorio", sin marcar', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness signerCount={1} requiresOrder={false} />);

    await user.click(screen.getByRole('button', { name: 'Testigo' }));

    const checkboxes = addToDirectoryCheckboxes();
    expect(checkboxes).toHaveLength(2);
    for (const checkbox of checkboxes) {
      expect(checkbox).not.toBeChecked();
    }
  });

  it('el checkbox se marca y desmarca', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness signerCount={1} requiresOrder={false} />);
    const [checkbox] = addToDirectoryCheckboxes();

    await user.click(checkbox);
    expect(checkbox).toBeChecked();

    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it('la tarjeta propia no trae el checkbox', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SelfSignerHarness />);

    await user.click(includeMeCheckbox());

    await waitFor(() => expect(selfCards()).toHaveLength(1));
    expect(addToDirectoryCheckboxes()).toHaveLength(0);
  });
});

/**
 * Historia "Enviar colaboradores desde Directorio mediante usuario vinculado al crear un
 * documento": elegir un contacto en el modal agrega su tarjeta.
 */
describe('CollaboratorsFieldArray · elegir del Directorio', () => {
  const ANA: DirectoryContact = {
    id: 'contact-1',
    firstName: 'Ana',
    lastName: 'García',
    email: 'ana@example.com',
    linkedUserId: 'user-ana',
  };

  async function pickFromDirectory(
    contact: DirectoryContact,
    role: 'firmante' | 'testigo',
  ) {
    mockedSearchDirectory.mockResolvedValue([contact]);
    const user = userEvent.setup();
    renderWithProviders(<Harness signerCount={0} requiresOrder={false} />);

    await user.click(screen.getByRole('button', { name: 'Directorio' }));
    await user.type(
      await screen.findByRole('searchbox', { name: /buscar contacto/i }),
      'ana',
    );
    await user.click(
      await screen.findByRole('button', {
        name: new RegExp(`como ${role}`, 'i'),
      }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  }

  it('un contacto con usuario vinculado se agrega como firmante del Directorio, en solo lectura', async () => {
    await pickFromDirectory(ANA, 'firmante');

    expect(
      screen.getByText('Firmante', { selector: 'span' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Directorio', { selector: 'span' }),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('Ana')).toBeDisabled();
    expect(screen.getByDisplayValue('ana@example.com')).toBeDisabled();
    expect(
      screen.queryByRole('checkbox', { name: /agregar al directorio/i }),
    ).not.toBeInTheDocument();
  });

  it('como testigo del Directorio no pide RFC', async () => {
    await pickFromDirectory(ANA, 'testigo');

    expect(
      screen.getByText('Testigo', { selector: 'span' }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/rfc/i)).not.toBeInTheDocument();
  });

  it('un contacto sin usuario vinculado se agrega como captura manual editable', async () => {
    await pickFromDirectory({ ...ANA, linkedUserId: null }, 'testigo');

    expect(
      screen.queryByText('Directorio', { selector: 'span' }),
    ).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Ana')).toBeEnabled();
    expect(
      screen.getByRole('checkbox', { name: /agregar al directorio/i }),
    ).not.toBeChecked();
  });
});
