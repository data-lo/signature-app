import { useForm } from 'react-hook-form';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test-utils';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import CollaboratorsFieldArray from './CollaboratorsFieldArray';
import IncludeMeAsSignerField from './IncludeMeAsSignerField';
import { emptySigner, type CreateDocumentSignaturesFormValues } from '../_schemas';

jest.mock('@/lib/hooks/useCurrentUser');

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
