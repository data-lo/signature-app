import { render, screen } from '@testing-library/react';
import RolePermissionsPreview from './RolePermissionsPreview';
import type { RolePermission } from '@/lib/api/roles';

const CATALOG_PERMISSION: RolePermission = {
  id: 'permission-create',
  key: 'DOCUMENT.CREATE',
  resource: 'DOCUMENT',
  action: 'CREATE',
  scope: 'ANY',
  description:
    'Crear documentos o borradores dentro de la organización activa.',
  isStaticCatalog: true,
};

const INTERNAL_PERMISSION: RolePermission = {
  id: 'permission-organization-read',
  key: 'ORGANIZATION.READ',
  resource: 'ORGANIZATION',
  action: 'READ',
  scope: 'ANY',
  description: 'Consultar un recurso existente — Cuentas de tipo organización',
  isStaticCatalog: false,
};

describe('RolePermissionsPreview', () => {
  it('pide elegir un rol mientras no haya ninguno seleccionado', () => {
    render(<RolePermissionsPreview permissions={[]} />);

    expect(screen.getByText(/selecciona un rol/i)).toBeInTheDocument();
  });

  it('lista los permisos del catálogo con el nombre del rol', () => {
    render(
      <RolePermissionsPreview
        roleName="MEMBER"
        permissions={[CATALOG_PERMISSION]}
      />,
    );

    expect(screen.getByText('MEMBER')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Crear documentos o borradores dentro de la organización activa.',
      ),
    ).toBeInTheDocument();
  });

  /**
   * La rejilla CRUD heredada del seed de roles no es una capacidad de negocio: se resume en una
   * línea en vez de listarse, para no llenar el modal de ruido interno ni ocultar que existe.
   */
  it('resume los permisos internos en vez de listarlos', () => {
    render(
      <RolePermissionsPreview
        roleName="ADMIN"
        permissions={[CATALOG_PERMISSION, INTERNAL_PERMISSION]}
      />,
    );

    expect(
      screen.queryByText(
        'Consultar un recurso existente — Cuentas de tipo organización',
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/1 permiso interno de administración/i),
    ).toBeInTheDocument();
  });

  it('avisa cuando el rol no otorga ningún permiso del catálogo', () => {
    render(
      <RolePermissionsPreview
        roleName="MEMBER"
        permissions={[INTERNAL_PERMISSION]}
      />,
    );

    expect(
      screen.getByText(/no otorga todavía ninguno de los permisos/i),
    ).toBeInTheDocument();
  });
});
