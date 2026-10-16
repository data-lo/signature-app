import userEvent from '@testing-library/user-event';

import { renderWithProviders, screen, waitFor, within } from '@/test-utils';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type { PermissionKey } from '@/lib/authorization/authorization.types';
import {
  createDirectoryContactRequest,
  deleteDirectoryContactRequest,
  listDirectoryContactsRequest,
  updateDirectoryContactRequest,
  type DirectoryContact,
} from '../_requests';
import DirectoryView, { DIRECTORY_LOAD_ERROR_MESSAGE } from './DirectoryView';
import {
  EMPTY_DIRECTORY_MESSAGE,
  noDirectoryMatchesMessage,
} from './DirectoryContactsTable';

jest.mock('../_requests');

const mockedList = listDirectoryContactsRequest as jest.Mock;
const mockedCreate = createDirectoryContactRequest as jest.Mock;
const mockedUpdate = updateDirectoryContactRequest as jest.Mock;
const mockedDelete = deleteDirectoryContactRequest as jest.Mock;

const CONTACTS: DirectoryContact[] = [
  {
    id: 'contact-1',
    firstName: 'Ana',
    lastName: 'García',
    email: 'ana@example.com',
    createdAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'contact-2',
    firstName: 'Luis',
    lastName: 'Pérez',
    email: 'luis@example.com',
    createdAt: '2026-10-02T10:00:00.000Z',
  },
];

const ALL_DIRECTORY_PERMISSIONS: PermissionKey[] = [
  'DIRECTORY.READ',
  'DIRECTORY.CREATE',
  'DIRECTORY.UPDATE',
  'DIRECTORY.DELETE',
];

function pageOf(
  items: DirectoryContact[],
  pagination: Partial<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> = {},
) {
  return {
    items,
    pagination: {
      page: 1,
      limit: 25,
      total: items.length,
      totalPages: items.length === 0 ? 0 : 1,
      ...pagination,
    },
  };
}

function renderView(permissions: PermissionKey[]) {
  return renderWithProviders(<DirectoryView />, { permissions });
}

/** Abre el menú de tres puntos de una fila. */
async function openRowActions(
  user: ReturnType<typeof userEvent.setup>,
  fullName: string,
) {
  await user.click(
    await screen.findByRole('button', { name: `Acciones de ${fullName}` }),
  );
}

describe('DirectoryView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedList.mockResolvedValue(pageOf(CONTACTS));
    useAuthStore.setState({
      activeAccount: {
        id: 'org-account-1',
        accountType: 'ORGANIZATION',
        organizationId: 'org-1',
        roleId: 'admin-role-1',
      },
    });
  });

  it('muestra índice, nombre completo, correo y fecha de registro', async () => {
    renderView(['DIRECTORY.READ']);

    const row = (await screen.findByText('Ana García')).closest('tr')!;
    expect(within(row).getByText('1')).toBeInTheDocument();
    expect(within(row).getAllByText('ana@example.com').length).toBeGreaterThan(
      0,
    );
    expect(row).toHaveTextContent('Ana García');
    expect(screen.getByText('Luis Pérez').closest('tr')).toHaveTextContent('2');
    expect(mockedList).toHaveBeenCalledWith({
      page: 1,
      limit: 25,
      search: '',
    });
  });

  it('dice que el directorio está vacío cuando no hay contactos', async () => {
    mockedList.mockResolvedValue(pageOf([]));

    renderView(['DIRECTORY.READ']);

    expect(
      await screen.findByText(EMPTY_DIRECTORY_MESSAGE),
    ).toBeInTheDocument();
  });

  it('si la consulta falla, el error se pinta dentro de la tabla', async () => {
    mockedList.mockRejectedValue(new Error('500'));

    renderView(['DIRECTORY.READ']);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      DIRECTORY_LOAD_ERROR_MESSAGE,
    );
  });

  it('sin DIRECTORY.READ no consulta ni muestra la tabla', () => {
    renderView(['DIRECTORY.CREATE']);

    expect(
      screen.getByText(/no tienes permisos para ver el directorio/i),
    ).toBeInTheDocument();
    expect(mockedList).not.toHaveBeenCalled();
  });

  it('con sólo DIRECTORY.READ no ofrece crear ni acciones por fila', async () => {
    renderView(['DIRECTORY.READ']);

    await screen.findByText('Ana García');

    expect(
      screen.queryByRole('button', { name: /crear contacto/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /acciones de/i }),
    ).not.toBeInTheDocument();
  });

  it('el menú sólo ofrece las acciones que el rol permite', async () => {
    const user = userEvent.setup();
    renderView(['DIRECTORY.READ', 'DIRECTORY.UPDATE']);

    await openRowActions(user, 'Ana García');

    expect(
      await screen.findByRole('menuitem', { name: /actualizar/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: /eliminar/i }),
    ).not.toBeInTheDocument();
  });

  it('crea un contacto desde el modal y refresca la tabla', async () => {
    const user = userEvent.setup();
    mockedCreate.mockResolvedValue({ ...CONTACTS[0], id: 'contact-3' });
    renderView(ALL_DIRECTORY_PERMISSIONS);

    await user.click(
      await screen.findByRole('button', { name: /crear contacto/i }),
    );
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Nombre'), ' Marta ');
    await user.type(within(dialog).getByLabelText('Apellido'), 'Ruiz');
    await user.type(
      within(dialog).getByLabelText('Correo electrónico'),
      'marta@example.com',
    );
    await user.click(
      within(dialog).getByRole('button', { name: 'Crear contacto' }),
    );

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith({
        firstName: 'Marta',
        lastName: 'Ruiz',
        email: 'marta@example.com',
      }),
    );
    await waitFor(() => expect(mockedList).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('no envía el alta con un correo inválido', async () => {
    const user = userEvent.setup();
    renderView(ALL_DIRECTORY_PERMISSIONS);

    await user.click(
      await screen.findByRole('button', { name: /crear contacto/i }),
    );
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Nombre'), 'Marta');
    await user.type(within(dialog).getByLabelText('Apellido'), 'Ruiz');
    await user.type(
      within(dialog).getByLabelText('Correo electrónico'),
      'marta@',
    );

    expect(
      await within(dialog).findByText('Ingresa un correo electrónico válido.'),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Crear contacto' }),
    ).toBeDisabled();
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('"Actualizar" abre el mismo modal con los datos del contacto y guarda los cambios', async () => {
    const user = userEvent.setup();
    mockedUpdate.mockResolvedValue({ ...CONTACTS[0], lastName: 'López' });
    renderView(ALL_DIRECTORY_PERMISSIONS);

    await openRowActions(user, 'Ana García');
    await user.click(
      await screen.findByRole('menuitem', { name: /actualizar/i }),
    );

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('Nombre')).toHaveValue('Ana');
    expect(within(dialog).getByLabelText('Correo electrónico')).toHaveValue(
      'ana@example.com',
    );

    const lastName = within(dialog).getByLabelText('Apellido');
    await user.clear(lastName);
    await user.type(lastName, 'López');
    await user.click(
      within(dialog).getByRole('button', { name: 'Guardar cambios' }),
    );

    await waitFor(() =>
      expect(mockedUpdate).toHaveBeenCalledWith('contact-1', {
        firstName: 'Ana',
        lastName: 'López',
        email: 'ana@example.com',
      }),
    );
    await waitFor(() => expect(mockedList).toHaveBeenCalledTimes(2));
  });

  it('eliminar pide confirmación antes de borrar y después refresca la tabla', async () => {
    const user = userEvent.setup();
    mockedDelete.mockResolvedValue(undefined);
    renderView(ALL_DIRECTORY_PERMISSIONS);

    await openRowActions(user, 'Luis Pérez');
    await user.click(
      await screen.findByRole('menuitem', { name: /eliminar/i }),
    );

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('luis@example.com');
    expect(mockedDelete).not.toHaveBeenCalled();

    mockedList.mockResolvedValue(pageOf([CONTACTS[0]]));
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith('contact-2'));
    await waitFor(() =>
      expect(screen.queryByText('Luis Pérez')).not.toBeInTheDocument(),
    );
  });

  it('cancelar la confirmación no elimina nada', async () => {
    const user = userEvent.setup();
    renderView(ALL_DIRECTORY_PERMISSIONS);

    await openRowActions(user, 'Ana García');
    await user.click(
      await screen.findByRole('menuitem', { name: /eliminar/i }),
    );
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Cancelar',
      }),
    );

    expect(mockedDelete).not.toHaveBeenCalled();
  });

  describe('búsqueda', () => {
    it('busca en el backend tras la pausa, desde la página 1', async () => {
      const user = userEvent.setup();
      renderView(['DIRECTORY.READ']);
      await screen.findByText('Ana García');

      mockedList.mockResolvedValue(pageOf([CONTACTS[0]]));
      await user.type(
        screen.getByRole('searchbox', { name: /buscar contactos/i }),
        'garcia',
      );

      await waitFor(() =>
        expect(mockedList).toHaveBeenLastCalledWith({
          page: 1,
          limit: 25,
          search: 'garcia',
        }),
      );
      await waitFor(() =>
        expect(screen.queryByText('Luis Pérez')).not.toBeInTheDocument(),
      );
      expect(screen.getByText('Ana García')).toBeInTheDocument();
      // Una consulta por búsqueda aplicada, no una por tecla.
      expect(
        mockedList.mock.calls.filter(([params]) => params.search !== ''),
      ).toHaveLength(1);
    });

    it('dice que nada coincide cuando la búsqueda no encuentra contactos', async () => {
      const user = userEvent.setup();
      renderView(['DIRECTORY.READ']);
      await screen.findByText('Ana García');

      mockedList.mockResolvedValue(pageOf([]));
      await user.type(
        screen.getByRole('searchbox', { name: /buscar contactos/i }),
        'zzz',
      );

      expect(
        await screen.findByText(noDirectoryMatchesMessage('zzz')),
      ).toBeInTheDocument();
    });
  });

  describe('paginación', () => {
    beforeEach(() => {
      mockedList.mockImplementation(({ page, limit }) =>
        Promise.resolve(
          pageOf(page === 1 ? CONTACTS : [CONTACTS[0]], {
            page,
            limit,
            total: 30,
            totalPages: Math.ceil(30 / limit),
          }),
        ),
      );
    });

    it('muestra el total y la página actual de las disponibles', async () => {
      renderView(['DIRECTORY.READ']);

      await screen.findByText('Ana García');

      expect(screen.getByText(/30 contactos/)).toBeInTheDocument();
      expect(
        screen.getByText(
          (_, element) =>
            element?.getAttribute('data-slot') ===
              'directory-table-page-indicator' &&
            element.textContent === '1 de 2',
        ),
      ).toBeInTheDocument();
    });

    it('pasa de página y numera las filas de forma continua', async () => {
      const user = userEvent.setup();
      renderView(['DIRECTORY.READ']);
      await screen.findByText('Ana García');

      await user.click(
        screen.getByRole('button', { name: 'Página siguiente' }),
      );

      await waitFor(() =>
        expect(mockedList).toHaveBeenLastCalledWith({
          page: 2,
          limit: 25,
          search: '',
        }),
      );
      const row = (await screen.findByText('Ana García')).closest('tr')!;
      expect(row).toHaveTextContent('26');
      expect(
        screen.getByRole('button', { name: 'Página siguiente' }),
      ).toBeDisabled();
    });

    it('cambiar los contactos por página vuelve a la página 1', async () => {
      const user = userEvent.setup();
      renderView(['DIRECTORY.READ']);
      await screen.findByText('Ana García');
      await user.click(
        screen.getByRole('button', { name: 'Página siguiente' }),
      );
      await waitFor(() =>
        expect(mockedList).toHaveBeenLastCalledWith(
          expect.objectContaining({ page: 2 }),
        ),
      );

      screen.getByRole('combobox', { name: 'Contactos por página' }).focus();
      await user.keyboard('{Enter}');
      await user.click(await screen.findByRole('option', { name: '10' }));

      await waitFor(() =>
        expect(mockedList).toHaveBeenLastCalledWith({
          page: 1,
          limit: 10,
          search: '',
        }),
      );
    });

    it('al eliminar el único contacto de la última página, baja a la anterior', async () => {
      const user = userEvent.setup();
      mockedDelete.mockResolvedValue(undefined);
      renderView(ALL_DIRECTORY_PERMISSIONS);
      await screen.findByText('Ana García');
      await user.click(
        screen.getByRole('button', { name: 'Página siguiente' }),
      );
      await screen.findByText('26');

      // Tras eliminarlo, el directorio cabe en una página y la 2 llega vacía.
      mockedList.mockImplementation(({ page, limit }) =>
        Promise.resolve(
          pageOf(page === 1 ? CONTACTS.slice(1) : [], {
            page,
            limit,
            total: 1,
            totalPages: 1,
          }),
        ),
      );
      await openRowActions(user, 'Ana García');
      await user.click(
        await screen.findByRole('menuitem', { name: /eliminar/i }),
      );
      await user.click(
        within(await screen.findByRole('dialog')).getByRole('button', {
          name: 'Eliminar',
        }),
      );

      expect(await screen.findByText('Luis Pérez')).toBeInTheDocument();
      expect(mockedList).toHaveBeenLastCalledWith({
        page: 1,
        limit: 25,
        search: '',
      });
      expect(
        screen.queryByText(EMPTY_DIRECTORY_MESSAGE),
      ).not.toBeInTheDocument();
    });
  });
});
