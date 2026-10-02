import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import RolesTable, {
  EMPTY_ROLES_MESSAGE,
  ROLE_SECONDARY_COLUMN_CLASS,
} from './RolesTable';
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

/**
 * Homologación con la tabla de Documentos: tarjeta, encabezado, carga, error, vacío y
 * tratamiento responsivo.
 */
describe('RolesTable — estructura de Documentos', () => {
  it('va dentro de la tarjeta de tabla con el encabezado gris', () => {
    const { container } = render(
      <RolesTable roles={ROLES} canManage={false} onEdit={jest.fn()} />,
    );

    expect(
      container.querySelector('[data-slot="roles-table-card"]'),
    ).toHaveClass('bg-card', 'border', 'rounded-xl');
    expect(container.querySelector('thead')).toHaveClass('bg-muted/60');
  });

  it('con canManage pinta las columnas en orden y "Acciones" al final', () => {
    render(<RolesTable roles={ROLES} canManage onEdit={jest.fn()} />);

    expect(
      screen.getAllByRole('columnheader').map((header) => header.textContent),
    ).toEqual(['Nombre', 'Tipo', 'Permisos', 'Fecha de creación', 'Acciones']);
  });

  it('mientras carga dibuja el esqueleto y ninguna fila', () => {
    const { container } = render(
      <RolesTable roles={ROLES} canManage onEdit={jest.fn()} isLoading />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Cargando roles');
    expect(
      container.querySelectorAll('[data-slot="roles-loading-row"]'),
    ).toHaveLength(5);
    expect(screen.queryByText('Aprobador')).not.toBeInTheDocument();
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
  });

  it('el error manda sobre la lista y el aviso de roles personalizados', () => {
    render(
      <RolesTable
        roles={ROLES}
        canManage
        onEdit={jest.fn()}
        errorMessage="No pudimos cargar los roles."
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No pudimos cargar los roles.',
    );
    expect(screen.queryByText('Aprobador')).not.toBeInTheDocument();
    expect(
      screen.queryByText(/todavía no hay roles personalizados/i),
    ).not.toBeInTheDocument();
  });

  it('sin roles muestra el estado vacío dentro de la tabla', () => {
    render(<RolesTable roles={[]} canManage={false} onEdit={jest.fn()} />);

    expect(screen.getByText(EMPTY_ROLES_MESSAGE).closest('td')).toHaveAttribute(
      'colspan',
      '4',
    );
  });

  /** jsdom no aplica media queries: la regresión móvil se fija en las clases responsivas. */
  describe('layout móvil', () => {
    it('oculta la fecha como columna y la apila bajo el nombre sólo en móvil', () => {
      const { container } = render(
        <RolesTable roles={ROLES} canManage onEdit={jest.fn()} />,
      );

      expect(
        screen.getByRole('columnheader', { name: 'Fecha de creación' }),
      ).toHaveClass(...ROLE_SECONDARY_COLUMN_CLASS.split(' '));
      const [details] = container.querySelectorAll(
        '[data-slot="role-mobile-details"]',
      );
      expect(details).toHaveClass('md:hidden');
      expect(details).toHaveTextContent('Creado: 15/01/2026');
    });

    it('la columna de acciones sigue visible en móvil', () => {
      render(<RolesTable roles={ROLES} canManage onEdit={jest.fn()} />);

      expect(
        screen
          .getByRole('button', { name: 'Acciones de Aprobador' })
          .closest('td'),
      ).not.toHaveClass('hidden');
    });
  });
});
