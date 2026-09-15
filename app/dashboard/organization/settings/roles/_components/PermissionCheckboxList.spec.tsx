import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import PermissionCheckboxList from './PermissionCheckboxList';
import type { RolePermission } from '@/lib/api/organization-roles';

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
    id: 'permission-invite',
    key: 'MEMBER.INVITE',
    resource: 'MEMBER',
    action: 'INVITE',
    scope: 'ANY',
    description: 'Invitar miembros a la organización activa.',
    isStaticCatalog: true,
  },
];

/** La rejilla CRUD heredada del seed de roles: llega en la respuesta pero no se ofrece. */
const INTERNAL_PERMISSION: RolePermission = {
  id: 'permission-organization-read',
  key: 'ORGANIZATION.READ',
  resource: 'ORGANIZATION',
  action: 'READ',
  scope: 'ANY',
  description: 'Consultar un recurso existente — Cuentas de tipo organización',
  isStaticCatalog: false,
};

describe('PermissionCheckboxList', () => {
  /**
   * La clave del catálogo es nomenclatura interna: viaja al backend y liga el checkbox con su
   * etiqueta, pero quien crea un rol sólo debe leer qué habilita cada permiso.
   */
  it('rotula cada permiso con su descripción y nunca con su clave técnica', () => {
    render(
      <PermissionCheckboxList
        availablePermissions={CATALOG_PERMISSIONS}
        selectedKeys={[]}
        onChange={jest.fn()}
      />,
    );

    expect(
      screen.getByText(
        'Crear documentos o borradores dentro de la organización activa.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('DOCUMENT.CREATE')).not.toBeInTheDocument();
    expect(screen.queryByText('MEMBER.INVITE')).not.toBeInTheDocument();
  });

  it('no ofrece los permisos que no son del catálogo estático', () => {
    render(
      <PermissionCheckboxList
        availablePermissions={[...CATALOG_PERMISSIONS, INTERNAL_PERMISSION]}
        selectedKeys={[]}
        onChange={jest.fn()}
      />,
    );

    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    expect(
      screen.queryByText(
        'Consultar un recurso existente — Cuentas de tipo organización',
      ),
    ).not.toBeInTheDocument();
  });

  it('marca un permiso devolviendo su clave aunque la etiqueta sea la descripción', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <PermissionCheckboxList
        availablePermissions={CATALOG_PERMISSIONS}
        selectedKeys={[]}
        onChange={onChange}
      />,
    );

    await user.click(
      screen.getByRole('checkbox', {
        name: 'Invitar miembros a la organización activa.',
      }),
    );

    expect(onChange).toHaveBeenCalledWith(['MEMBER.INVITE']);
  });

  it('desmarca un permiso ya seleccionado', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <PermissionCheckboxList
        availablePermissions={CATALOG_PERMISSIONS}
        selectedKeys={['DOCUMENT.CREATE', 'MEMBER.INVITE']}
        onChange={onChange}
      />,
    );

    await user.click(
      screen.getByRole('checkbox', {
        name: 'Crear documentos o borradores dentro de la organización activa.',
      }),
    );

    expect(onChange).toHaveBeenCalledWith(['MEMBER.INVITE']);
  });

  it('avisa cuando no llega ningún permiso del catálogo', () => {
    render(
      <PermissionCheckboxList
        availablePermissions={[INTERNAL_PERMISSION]}
        selectedKeys={[]}
        onChange={jest.fn()}
      />,
    );

    expect(
      screen.getByText(/no se pudo cargar el catálogo de permisos/i),
    ).toBeInTheDocument();
  });
});
