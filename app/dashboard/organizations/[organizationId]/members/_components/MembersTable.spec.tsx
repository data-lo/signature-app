import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import MembersTable, {
  EMPTY_MEMBERS_MESSAGE,
  MEMBER_SECONDARY_COLUMN_CLASS,
} from './MembersTable';
import type { OrganizationMember } from '@/lib/api/organization-members';
import type { RolePermission } from '@/lib/api/roles';

const CATALOG_PERMISSIONS: RolePermission[] = [
  {
    id: 'permission-create',
    key: 'DOCUMENT.CREATE',
    resource: 'DOCUMENT',
    action: 'CREATE',
    scope: 'ANY',
    description:
      'Crear documentos o borradores dentro de la organización activa.',
    isStaticCatalog: true,
  },
  {
    id: 'permission-sign-self',
    key: 'DOCUMENT.SIGN_SELF',
    resource: 'DOCUMENT',
    action: 'SIGN',
    scope: 'SELF',
    description: 'Firmar en nombre propio e incluirse como firmante.',
    isStaticCatalog: true,
  },
];

/** La rejilla CRUD heredada del seed de roles: llega en la respuesta pero no se pinta. */
const INTERNAL_PERMISSION: RolePermission = {
  id: 'permission-organization-read',
  key: 'ORGANIZATION.READ',
  resource: 'ORGANIZATION',
  action: 'READ',
  scope: 'ANY',
  description: 'Consultar un recurso existente — Cuentas de tipo organización',
  isStaticCatalog: false,
};

const MEMBERS: OrganizationMember[] = [
  {
    accountId: 'account-1',
    userId: 'user-1',
    email: 'admin@empresa.com',
    rfc: 'XAXX010101000',
    role: { id: 'admin-role-1', name: 'ADMIN' },
    joinedAt: '2023-10-25T10:00:00Z',
    status: 'active',
    isActive: true,
    permissions: [...CATALOG_PERMISSIONS, INTERNAL_PERMISSION],
  },
  {
    accountId: 'account-2',
    userId: 'user-2',
    email: 'sin-datos@empresa.com',
    rfc: null,
    role: null,
    joinedAt: null,
    status: 'removed',
    isActive: false,
    permissions: [],
  },
];

describe('MembersTable', () => {
  it('muestra email, RFC, rol y fecha de ingreso de cada miembro', () => {
    render(<MembersTable members={MEMBERS} canManage={false} />);

    expect(screen.getByText('admin@empresa.com')).toBeInTheDocument();
    expect(screen.getByText('XAXX010101000')).toBeInTheDocument();
    // El rol viaja como ADMIN y se muestra traducido (ver `formatRoleName`).
    expect(screen.getByText('ADMINISTRADOR')).toBeInTheDocument();
    expect(screen.queryByText('ADMIN')).not.toBeInTheDocument();
    expect(screen.getByText('25/10/2023')).toBeInTheDocument();
  });

  it('muestra el estado de cada membresía', () => {
    render(<MembersTable members={MEMBERS} canManage={false} />);

    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(screen.getByText('Dado de baja')).toBeInTheDocument();
  });

  /**
   * Los permisos internos de administración no cuentan: la columna responde "qué puede hacer esta
   * persona", y `ORGANIZATION.READ` no es una capacidad que el administrador reconozca.
   */
  it('cuenta sólo los permisos del catálogo estático', () => {
    render(<MembersTable members={MEMBERS} canManage={false} />);

    expect(
      screen.getByRole('button', { name: '2 permisos' }),
    ).toBeInTheDocument();
  });

  it('al abrir el detalle lista los permisos derivados del rol', async () => {
    const user = userEvent.setup();
    render(<MembersTable members={MEMBERS} canManage={false} />);

    await user.click(screen.getByRole('button', { name: '2 permisos' }));

    expect(
      await screen.findByText(
        'Crear documentos o borradores dentro de la organización activa.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Firmar en nombre propio e incluirse como firmante.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        'Consultar un recurso existente — Cuentas de tipo organización',
      ),
    ).not.toBeInTheDocument();
  });

  it('muestra "—" cuando rfc/rol/permisos/fecha de ingreso son null o vacíos', () => {
    render(<MembersTable members={MEMBERS} canManage={false} />);

    expect(screen.getByText('sin-datos@empresa.com')).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(4);
  });

  it('no renderiza la columna de acciones cuando canManage es false', () => {
    render(<MembersTable members={MEMBERS} canManage={false} />);

    expect(
      screen.queryByRole('button', { name: /acciones de/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
  });

  it('al elegir "Editar Rol" llama a onEditRole con el miembro de esa fila', async () => {
    const user = userEvent.setup();
    const onEditRole = jest.fn();
    render(
      <MembersTable members={MEMBERS} canManage onEditRole={onEditRole} />,
    );

    await user.click(
      screen.getByRole('button', { name: 'Acciones de admin@empresa.com' }),
    );
    await user.click(
      await screen.findByRole('menuitem', { name: /editar rol/i }),
    );

    expect(onEditRole).toHaveBeenCalledWith(MEMBERS[0]);
  });

  /**
   * "Etiquetas del catálogo" se retiró del menú: asignar etiquetas a una membresía no es cosa de
   * este módulo. El menú queda con las dos acciones que sí lo son, y se comprueban las tres cosas
   * juntas —que la opción no está y que las otras dos siguen— porque quitar una entrada de un
   * menú es justo el cambio que se lleva por delante a las vecinas.
   */
  it('el menú ofrece editar rol y desactivar, y ya no las etiquetas del catálogo', async () => {
    const user = userEvent.setup();
    render(<MembersTable members={MEMBERS} canManage />);

    await user.click(
      screen.getByRole('button', { name: 'Acciones de admin@empresa.com' }),
    );

    expect(
      await screen.findByRole('menuitem', { name: /editar rol/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: /desactivar/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: /etiquetas del catálogo/i }),
    ).not.toBeInTheDocument();
  });

  it('al elegir "Desactivar" llama a onRemove con el miembro de esa fila', async () => {
    const user = userEvent.setup();
    const onRemove = jest.fn();
    render(<MembersTable members={MEMBERS} canManage onRemove={onRemove} />);

    await user.click(
      screen.getByRole('button', { name: 'Acciones de admin@empresa.com' }),
    );
    await user.click(
      await screen.findByRole('menuitem', { name: /desactivar/i }),
    );

    expect(onRemove).toHaveBeenCalledWith(MEMBERS[0]);
  });

  /** Desactivar a quien ya está dado de baja no tiene efecto; la opción se deshabilita. */
  it('deshabilita "Desactivar" en una membresía ya dada de baja', async () => {
    const user = userEvent.setup();
    render(<MembersTable members={MEMBERS} canManage onRemove={jest.fn()} />);

    await user.click(
      screen.getByRole('button', { name: 'Acciones de sin-datos@empresa.com' }),
    );

    expect(
      await screen.findByRole('menuitem', { name: /desactivar/i }),
    ).toHaveAttribute('data-disabled');
  });

  /** Historia "Impedir desactivación de cuentas con perfil Owner". */
  describe('propietario', () => {
    const OWNER: OrganizationMember = {
      accountId: 'account-owner',
      userId: 'user-owner',
      email: 'duena@empresa.com',
      rfc: null,
      role: { id: 'owner-role-1', name: 'OWNER' },
      joinedAt: '2023-01-01T10:00:00Z',
      status: 'active',
      isActive: true,
      permissions: [],
    };

    async function openOwnerMenu() {
      const user = userEvent.setup();
      const onRemove = jest.fn();
      const onEditRole = jest.fn();
      render(
        <MembersTable
          members={[OWNER, MEMBERS[0]]}
          canManage
          onRemove={onRemove}
          onEditRole={onEditRole}
        />,
      );
      await user.click(
        screen.getByRole('button', { name: 'Acciones de duena@empresa.com' }),
      );
      return { user, onRemove, onEditRole };
    }

    it('deshabilita "Desactivar" y explica por qué', async () => {
      const { user, onRemove } = await openOwnerMenu();

      const item = await screen.findByRole('menuitem', { name: /desactivar/i });
      expect(item).toHaveAttribute('data-disabled');
      expect(item).toHaveTextContent(
        'La cuenta del propietario (Owner) no se puede desactivar.',
      );

      await user.click(item);
      expect(onRemove).not.toHaveBeenCalled();
    });

    it('deshabilita "Editar Rol" y explica por qué', async () => {
      const { user, onEditRole } = await openOwnerMenu();

      const item = await screen.findByRole('menuitem', { name: /editar rol/i });
      expect(item).toHaveAttribute('data-disabled');
      expect(item).toHaveTextContent(
        'El rol del propietario (Owner) no se puede cambiar.',
      );

      await user.click(item);
      expect(onEditRole).not.toHaveBeenCalled();
    });

    it('a los demás miembros les sigue ofreciendo desactivar', async () => {
      const user = userEvent.setup();
      render(
        <MembersTable
          members={[OWNER, MEMBERS[0]]}
          canManage
          onRemove={jest.fn()}
        />,
      );

      await user.click(
        screen.getByRole('button', { name: 'Acciones de admin@empresa.com' }),
      );

      expect(
        await screen.findByRole('menuitem', { name: /desactivar/i }),
      ).not.toHaveAttribute('data-disabled');
    });
  });
});

/**
 * Homologación con la tabla de Documentos: misma tarjeta, encabezado, estados con punto de color
 * y tratamiento responsivo.
 */
describe('MembersTable — estructura de Documentos', () => {
  it('va dentro de la tarjeta de tabla con el encabezado gris', () => {
    const { container } = render(
      <MembersTable members={MEMBERS} canManage={false} />,
    );

    expect(
      container.querySelector('[data-slot="members-table-card"]'),
    ).toHaveClass('bg-card', 'border', 'rounded-xl');
    expect(container.querySelector('thead')).toHaveClass('bg-muted/60');
  });

  it('con canManage pinta las columnas en orden y "Acciones" al final', () => {
    render(<MembersTable members={MEMBERS} canManage />);

    expect(
      screen.getAllByRole('columnheader').map((header) => header.textContent),
    ).toEqual([
      'Correo',
      'RFC',
      'Rol',
      'Estado',
      'Permisos',
      'Fecha de ingreso',
      'Acciones',
    ]);
  });

  it('sin canManage no hay encabezado de acciones', () => {
    render(<MembersTable members={MEMBERS} canManage={false} />);

    expect(
      screen.queryByRole('columnheader', { name: 'Acciones' }),
    ).not.toBeInTheDocument();
  });

  it('muestra el estado con el punto de color de Documentos', () => {
    render(<MembersTable members={MEMBERS} canManage={false} />);

    expect(
      screen
        .getByText('Activo')
        .parentElement?.querySelector('[data-slot="status-dot"]'),
    ).toHaveClass('bg-emerald-500');
    expect(
      screen
        .getByText('Dado de baja')
        .parentElement?.querySelector('[data-slot="status-dot"]'),
    ).toHaveClass('bg-gray-400');
  });

  it('sin miembros muestra el estado vacío dentro de la tabla', () => {
    render(<MembersTable members={[]} canManage />);

    expect(
      screen.getByText(EMPTY_MEMBERS_MESSAGE).closest('td'),
    ).toHaveAttribute('colspan', '7');
  });

  /**
   * jsdom no aplica media queries, así que la regresión del layout móvil se fija en las clases
   * responsivas: RFC y fecha se ocultan como columna y reaparecen bajo el correo sólo en móvil,
   * y la columna de acciones nunca se oculta.
   */
  describe('layout móvil', () => {
    it('oculta RFC y fecha de ingreso como columna en pantallas angostas', () => {
      render(<MembersTable members={MEMBERS} canManage />);

      for (const name of ['RFC', 'Fecha de ingreso']) {
        expect(screen.getByRole('columnheader', { name })).toHaveClass(
          ...MEMBER_SECONDARY_COLUMN_CLASS.split(' '),
        );
      }
    });

    it('apila RFC y fecha bajo el correo, visibles sólo en móvil', () => {
      const { container } = render(
        <MembersTable members={MEMBERS} canManage />,
      );

      const details = container.querySelector(
        '[data-slot="member-mobile-details"]',
      );
      expect(details).toHaveClass('md:hidden');
      expect(details).toHaveTextContent('RFC: XAXX010101000');
      expect(details).toHaveTextContent('Ingreso: 25/10/2023');
    });

    it('la columna de acciones sigue visible en móvil', () => {
      render(<MembersTable members={MEMBERS} canManage />);

      expect(
        screen.getByRole('columnheader', { name: 'Acciones' }),
      ).not.toHaveClass('hidden');
      expect(
        screen
          .getByRole('button', { name: 'Acciones de admin@empresa.com' })
          .closest('td'),
      ).not.toHaveClass('hidden');
    });
  });
});
