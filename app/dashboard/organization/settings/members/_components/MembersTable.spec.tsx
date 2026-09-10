import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import MembersTable from './MembersTable';
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
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
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

  it('al elegir "Etiquetas del catálogo" llama a onConfigurePermissions con el miembro de esa fila', async () => {
    const user = userEvent.setup();
    const onConfigurePermissions = jest.fn();
    render(
      <MembersTable
        members={MEMBERS}
        canManage
        onConfigurePermissions={onConfigurePermissions}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: 'Acciones de admin@empresa.com' }),
    );
    await user.click(
      await screen.findByRole('menuitem', { name: /etiquetas del catálogo/i }),
    );

    expect(onConfigurePermissions).toHaveBeenCalledWith(MEMBERS[0]);
  });

  it('al elegir "Eliminar" llama a onRemove con el miembro de esa fila', async () => {
    const user = userEvent.setup();
    const onRemove = jest.fn();
    render(<MembersTable members={MEMBERS} canManage onRemove={onRemove} />);

    await user.click(
      screen.getByRole('button', { name: 'Acciones de admin@empresa.com' }),
    );
    await user.click(
      await screen.findByRole('menuitem', { name: /eliminar/i }),
    );

    expect(onRemove).toHaveBeenCalledWith(MEMBERS[0]);
  });

  /** Dar de baja a quien ya está dado de baja no tiene efecto; la opción se deshabilita. */
  it('deshabilita "Eliminar" en una membresía ya dada de baja', async () => {
    const user = userEvent.setup();
    render(<MembersTable members={MEMBERS} canManage onRemove={jest.fn()} />);

    await user.click(
      screen.getByRole('button', { name: 'Acciones de sin-datos@empresa.com' }),
    );

    expect(
      await screen.findByRole('menuitem', { name: /eliminar/i }),
    ).toHaveAttribute('data-disabled');
  });
});
