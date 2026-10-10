import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor, within } from '@/test-utils';
import DirectoryContactsDialog from './DirectoryContactsDialog';
import {
  searchDirectoryContactsRequest,
  type DirectoryContact,
} from '../_requests';

jest.mock('../_requests', () => ({
  ...jest.requireActual('../_requests'),
  searchDirectoryContactsRequest: jest.fn(),
}));

const mockedSearch = searchDirectoryContactsRequest as jest.Mock;

const ANA: DirectoryContact = {
  id: 'contact-1',
  firstName: 'Ana',
  lastName: 'García López',
  email: 'ana.garcia@example.com',
  linkedUserId: 'user-ana',
};
const EXTERNAL: DirectoryContact = {
  id: 'contact-2',
  firstName: 'Carlos',
  lastName: 'Hernández',
  email: 'carlos@externo.mx',
  linkedUserId: null,
};

function renderDialog() {
  const props = {
    onOpenChange: jest.fn(),
    onSelectSigner: jest.fn(),
    onSelectWitness: jest.fn(),
  };
  renderWithProviders(<DirectoryContactsDialog open {...props} />);
  return props;
}

const searchbox = () =>
  screen.getByRole('searchbox', { name: /buscar contacto/i });

const resultItems = () =>
  within(
    screen.getByRole('list', { name: /resultados del directorio/i }),
  ).getAllByRole('listitem');

beforeEach(() => {
  mockedSearch.mockReset();
  mockedSearch.mockResolvedValue([ANA, EXTERNAL]);
});

/**
 * El modal consulta el Directorio de la cuenta activa (`GET /directory-contacts?email=`) y entrega
 * el contacto elegido; qué tarjeta se arma con él se prueba en `CollaboratorsFieldArray.spec.tsx`.
 */
describe('DirectoryContactsDialog', () => {
  it('sin búsqueda iniciada muestra la invitación a buscar y no consulta nada', () => {
    renderDialog();

    expect(searchbox()).toHaveValue('');
    expect(screen.getByText('Busca en tu directorio')).toBeInTheDocument();
    expect(mockedSearch).not.toHaveBeenCalled();
  });

  it('busca por lo escrito, recortado, y lista nombre, apellido y correo con sus dos botones', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(searchbox(), '  garcia ');

    await waitFor(() => expect(mockedSearch).toHaveBeenCalledWith('garcia'));
    const [first] = await waitFor(resultItems);
    expect(within(first).getByText('Ana García López')).toBeInTheDocument();
    expect(
      within(first).getByText('ana.garcia@example.com'),
    ).toBeInTheDocument();
    expect(
      within(first).getByRole('button', { name: /como testigo/i }),
    ).toBeInTheDocument();
    expect(
      within(first).getByRole('button', { name: /como firmante/i }),
    ).toBeInTheDocument();
  });

  it('marca "Sin cuenta" al contacto sin usuario vinculado', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(searchbox(), 'a');

    const [, second] = await waitFor(resultItems);
    expect(within(second).getByText(/sin cuenta/i)).toBeInTheDocument();
  });

  it('sin coincidencias muestra el estado vacío', async () => {
    mockedSearch.mockResolvedValue([]);
    const user = userEvent.setup();
    renderDialog();

    await user.type(searchbox(), 'zzz');

    expect(await screen.findByText('Sin resultados')).toBeInTheDocument();
  });

  it('si la búsqueda falla, lo dice dentro del modal', async () => {
    mockedSearch.mockRejectedValue(new Error('500'));
    const user = userEvent.setup();
    renderDialog();

    await user.type(searchbox(), 'ana');

    expect(
      await screen.findByText(/no pudimos consultar el directorio/i),
    ).toBeInTheDocument();
  });

  it.each([
    ['firmante', 'onSelectSigner'],
    ['testigo', 'onSelectWitness'],
  ] as const)(
    'elegir como %s entrega el contacto y cierra el modal',
    async (role, handler) => {
      const user = userEvent.setup();
      const props = renderDialog();

      await user.type(searchbox(), 'ana');
      const [first] = await waitFor(resultItems);
      await user.click(
        within(first).getByRole('button', {
          name: new RegExp(`como ${role}`, 'i'),
        }),
      );

      expect(props[handler]).toHaveBeenCalledWith(ANA);
      expect(props.onOpenChange).toHaveBeenCalledWith(false);
    },
  );
});
