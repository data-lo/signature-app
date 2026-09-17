import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import RolesTable from './RolesTable';
import type { OrganizationRole, RolePermission } from '@/lib/api/organization-roles';

const CATALOG_PERMISSIONS: RolePermission[] = [
  {
    id: 'permission-read-org',
    key: 'DOCUMENT.READ_ORGANIZATION',
    resource: 'DOCUMENT',
    action: 'READ',
    scope: 'ORGANIZATION',
    description: 'Consultar documentos de toda la organización.',
    isStaticCatalog: true,
  },
  {
    id: 'permission-approve',
    key: 'DOCUMENT.APPROVE',
    resource: 'DOCUMENT',
    action: 'APPROVE',
    scope: 'ANY',
    description:
      'Aprobar o autorizar documentos cuando el flujo existente lo soporte.',
    isStaticCatalog: true,
  },
];

/** La rejilla CRUD heredada del seed de roles: llega en la respuesta pero no se pinta. */
const INTERNAL_PERMISSION: RolePermission = {
  id: 'permission-organization-update',
  key: 'ORGANIZATION.UPDATE',
  resource: 'ORGANIZATION',
  action: 'UPDATE',
  scope: 'ANY',
  description: 'Actualizar un recurso existente — Cuentas de tipo organización',
  isStaticCatalog: false,
};

const ROLES: OrganizationRole[] = [
  {
    id: 'role-admin',
    name: 'ADMIN',
    isSystemRole: true,
    permissions: [...CATALOG_PERMISSIONS, INTERNAL_PERMISSION],
    createdAt: '2026-01-15T10:00:00.000Z',
  },
  {
    id: 'role-aprobador',
    name: 'Aprobador',
    isSystemRole: false,
    permissions: CATALOG_PERMISSIONS,
    createdAt: '2026-02-01T10:00:00.000Z',
  },
];

describe('RolesTable', () => {
  it('muestra nombre, tipo y fecha de creación de cada rol', () => {
    render(<RolesTable roles={ROLES} canManage={false} onEdit={jest.fn()} />);

    expect(screen.getByText('ADMINISTRADOR')).toBeInTheDocument();
    expect(screen.getByText('Predeterminado')).toBeInTheDocument();
    expect(screen.getByText('Aprobador')).toBeInTheDocument();
    expect(screen.getByText('Personalizado')).toBeInTheDocument();
    expect(screen.getByText('15/01/2026')).toBeInTheDocument();
  });

  /** ORGANIZATION.UPDATE no es una capacidad de negocio: no cuenta en el resumen de ADMIN. */
  it('cuenta sólo los permisos del catálogo estático', () => {
    render(<RolesTable roles={ROLES} canManage={false} onEdit={jest.fn()} />);

    expect(
      screen.getAllByRole('button', { name: '2 permisos' }),
    ).toHaveLength(2);
  });

  it('al abrir el detalle lista los permisos del catálogo estático', async () => {
    const user = userEvent.setup();
    render(<RolesTable roles={ROLES} canManage={false} onEdit={jest.fn()} />);

    await user.click(
      screen.getAllByRole('button', { name: '2 permisos' })[0],
    );

    expect(
      await screen.findByText('Consultar documentos de toda la organización.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        'Actualizar un recurso existente — Cuentas de tipo organización',
      ),
    ).not.toBeInTheDocument();
  });

  it('no ofrece acciones para un rol de sistema', async () => {
    const user = userEvent.setup();
    render(<RolesTable roles={ROLES} canManage onEdit={jest.fn()} />);

    expect(
      screen.queryByRole('button', { name: 'Acciones de ADMINISTRADOR' }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Acciones de Aprobador' }),
    );
    expect(
      await screen.findByRole('menuitem', { name: /editar/i }),
    ).toBeInTheDocument();
  });

  it('al elegir "Editar" llama a onEdit con el rol custom de esa fila', async () => {
    const user = userEvent.setup();
    const onEdit = jest.fn();
    render(<RolesTable roles={ROLES} canManage onEdit={onEdit} />);

    await user.click(
      screen.getByRole('button', { name: 'Acciones de Aprobador' }),
    );
    await user.click(await screen.findByRole('menuitem', { name: /editar/i }));

    expect(onEdit).toHaveBeenCalledWith(ROLES[1]);
  });

  it('no renderiza la columna de acciones cuando canManage es false', () => {
    render(<RolesTable roles={ROLES} canManage={false} onEdit={jest.fn()} />);

    expect(
      screen.queryByRole('button', { name: /acciones de/i }),
    ).not.toBeInTheDocument();
  });

  it('avisa cuando la organización no tiene roles personalizados', () => {
    const onlySystemRoles = ROLES.filter((role) => role.isSystemRole);
    render(
      <RolesTable roles={onlySystemRoles} canManage={false} onEdit={jest.fn()} />,
    );

    expect(
      screen.getByText(/todavía no hay roles personalizados/i),
    ).toBeInTheDocument();
  });
});
