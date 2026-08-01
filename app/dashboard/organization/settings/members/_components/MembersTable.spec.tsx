import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import MembersTable from './MembersTable';
import type { OrganizationMember } from '@/lib/api/organization-members';

const MEMBERS: OrganizationMember[] = [
  {
    accountId: 'account-1',
    userId: 'user-1',
    email: 'admin@empresa.com',
    rfc: 'XAXX010101000',
    role: { id: 'admin-role-1', name: 'ADMIN' },
    joinedAt: '2023-10-25T10:00:00Z',
  },
  {
    accountId: 'account-2',
    userId: 'user-2',
    email: 'sin-datos@empresa.com',
    rfc: null,
    role: null,
    joinedAt: null,
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

  it('muestra "—" cuando rfc/rol/fecha de ingreso son null', () => {
    render(<MembersTable members={MEMBERS} canManage={false} />);

    expect(screen.getByText('sin-datos@empresa.com')).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(3);
  });

  it('no renderiza la columna de acciones cuando canManage es false', () => {
    render(<MembersTable members={MEMBERS} canManage={false} />);

    expect(
      screen.queryByRole('button', { name: '' }),
    ).not.toBeInTheDocument();
    expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
  });

  it('al elegir "Editar Rol" llama a onEditRole con el miembro de esa fila', async () => {
    const user = userEvent.setup();
    const onEditRole = jest.fn();
    render(
      <MembersTable members={MEMBERS} canManage onEditRole={onEditRole} />,
    );

    const [firstRowTrigger] = screen.getAllByRole('button');
    await user.click(firstRowTrigger);
    await user.click(await screen.findByRole('menuitem', { name: /editar rol/i }));

    expect(onEditRole).toHaveBeenCalledWith(MEMBERS[0]);
  });

  it('al elegir "Configurar permisos" llama a onConfigurePermissions con el miembro de esa fila', async () => {
    const user = userEvent.setup();
    const onConfigurePermissions = jest.fn();
    render(
      <MembersTable
        members={MEMBERS}
        canManage
        onConfigurePermissions={onConfigurePermissions}
      />,
    );

    const [firstRowTrigger] = screen.getAllByRole('button');
    await user.click(firstRowTrigger);
    await user.click(
      await screen.findByRole('menuitem', { name: /configurar permisos/i }),
    );

    expect(onConfigurePermissions).toHaveBeenCalledWith(MEMBERS[0]);
  });

  it('al elegir "Eliminar" llama a onRemove con el miembro de esa fila', async () => {
    const user = userEvent.setup();
    const onRemove = jest.fn();
    render(<MembersTable members={MEMBERS} canManage onRemove={onRemove} />);

    const [firstRowTrigger] = screen.getAllByRole('button');
    await user.click(firstRowTrigger);
    await user.click(await screen.findByRole('menuitem', { name: /eliminar/i }));

    expect(onRemove).toHaveBeenCalledWith(MEMBERS[0]);
  });
});
