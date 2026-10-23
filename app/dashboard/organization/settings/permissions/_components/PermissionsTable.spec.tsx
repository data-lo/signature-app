import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import PermissionsTable from './PermissionsTable';
import type { OrganizationPermission } from '@/lib/api/organization-permissions';

const PERMISSIONS: OrganizationPermission[] = [
  {
    id: 'perm-1',
    organizationId: 'org-1',
    name: 'Aprobar documentos',
    isActive: true,
    createdAt: '2023-10-25T10:00:00Z',
  },
  {
    id: 'perm-2',
    organizationId: 'org-1',
    name: 'Ver reportes',
    isActive: false,
    createdAt: '2023-10-26T10:00:00Z',
  },
];

describe('PermissionsTable', () => {
  it('muestra el nombre y el estatus de cada permiso', () => {
    render(<PermissionsTable permissions={PERMISSIONS} canManage={false} />);

    expect(screen.getByText('Aprobar documentos')).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(screen.getByText('Ver reportes')).toBeInTheDocument();
    expect(screen.getByText('Inactivo')).toBeInTheDocument();
  });

  it('no renderiza la columna de acciones cuando canManage es false', () => {
    render(<PermissionsTable permissions={PERMISSIONS} canManage={false} />);

    expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
  });

  it('al elegir "Modificar" llama a onEdit con el permiso de esa fila', async () => {
    const user = userEvent.setup();
    const onEdit = jest.fn();
    render(
      <PermissionsTable permissions={PERMISSIONS} canManage onEdit={onEdit} />,
    );

    const [firstRowTrigger] = screen.getAllByRole('button');
    await user.click(firstRowTrigger);
    await user.click(await screen.findByRole('menuitem', { name: /modificar/i }));

    expect(onEdit).toHaveBeenCalledWith(PERMISSIONS[0]);
  });

  it('al elegir "Eliminar" llama a onDelete con el permiso de esa fila', async () => {
    const user = userEvent.setup();
    const onDelete = jest.fn();
    render(
      <PermissionsTable
        permissions={PERMISSIONS}
        canManage
        onDelete={onDelete}
      />,
    );

    const [firstRowTrigger] = screen.getAllByRole('button');
    await user.click(firstRowTrigger);
    await user.click(await screen.findByRole('menuitem', { name: /eliminar/i }));

    expect(onDelete).toHaveBeenCalledWith(PERMISSIONS[0]);
  });
});
