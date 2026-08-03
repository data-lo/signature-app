import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test-utils';
import PermissionsView from './PermissionsView';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useIsOrganizationAdmin } from '@/lib/hooks/useIsOrganizationAdmin';
import { useOrganizationPermissions } from '@/lib/hooks/useOrganizationPermissions';
import { useCreateOrganizationPermission } from '../_hooks/useCreateOrganizationPermission';
import { useUpdateOrganizationPermission } from '../_hooks/useUpdateOrganizationPermission';
import { useDeleteOrganizationPermission } from '../_hooks/useDeleteOrganizationPermission';
import type { ActiveAccount } from '@/lib/store/types/auth-store.types';
import type { OrganizationPermission } from '@/lib/api/organization-permissions';

jest.mock('@/lib/hooks/useIsOrganizationAdmin');
jest.mock('@/lib/hooks/useOrganizationPermissions');
jest.mock('../_hooks/useCreateOrganizationPermission');
jest.mock('../_hooks/useUpdateOrganizationPermission');
jest.mock('../_hooks/useDeleteOrganizationPermission');

const mockedUseIsOrganizationAdmin = useIsOrganizationAdmin as jest.Mock;
const mockedUseOrganizationPermissions = useOrganizationPermissions as jest.Mock;
const mockedUseCreateOrganizationPermission =
  useCreateOrganizationPermission as jest.Mock;
const mockedUseUpdateOrganizationPermission =
  useUpdateOrganizationPermission as jest.Mock;
const mockedUseDeleteOrganizationPermission =
  useDeleteOrganizationPermission as jest.Mock;

const ORG_ACCOUNT: ActiveAccount = {
  id: 'org-account-1',
  accountType: 'ORGANIZATION',
  organizationId: 'org-1',
  roleId: 'admin-role-1',
};

const PERSONAL_ACCOUNT: ActiveAccount = {
  id: 'personal-1',
  accountType: 'PERSONAL',
  organizationId: null,
  roleId: 'admin-role-1',
};

const PERMISSIONS: OrganizationPermission[] = [
  {
    id: 'perm-1',
    organizationId: 'org-1',
    name: 'Aprobar documentos',
    isActive: true,
    createdAt: '2023-10-25T10:00:00Z',
  },
];

describe('PermissionsView', () => {
  const createPermissionMutate = jest.fn();
  const updatePermissionMutate = jest.fn();
  const deletePermissionMutate = jest.fn();

  beforeEach(() => {
    createPermissionMutate.mockReset();
    updatePermissionMutate.mockReset();
    deletePermissionMutate.mockReset();
    useAuthStore.setState({ activeAccount: ORG_ACCOUNT });
    mockedUseIsOrganizationAdmin.mockReturnValue({
      isAdmin: true,
      isLoading: false,
    });
    mockedUseOrganizationPermissions.mockReturnValue({
      data: PERMISSIONS,
      isLoading: false,
    });
    mockedUseCreateOrganizationPermission.mockReturnValue({
      mutate: createPermissionMutate,
      isPending: false,
    });
    mockedUseUpdateOrganizationPermission.mockReturnValue({
      mutate: updatePermissionMutate,
      isPending: false,
    });
    mockedUseDeleteOrganizationPermission.mockReturnValue({
      mutate: deletePermissionMutate,
      isPending: false,
    });
  });

  it('muestra un mensaje y no consulta el catálogo si la cuenta activa no es una organización', () => {
    useAuthStore.setState({ activeAccount: PERSONAL_ACCOUNT });
    renderWithProviders(<PermissionsView />);

    expect(
      screen.getByText(/selecciona una organización/i),
    ).toBeInTheDocument();
    expect(screen.queryByText('Aprobar documentos')).not.toBeInTheDocument();
  });

  it('muestra un mensaje de acceso restringido si el usuario no es ADMIN de la organización activa', () => {
    mockedUseIsOrganizationAdmin.mockReturnValue({
      isAdmin: false,
      isLoading: false,
    });
    renderWithProviders(<PermissionsView />);

    expect(
      screen.getByText(/no tienes permisos para gestionar los permisos/i),
    ).toBeInTheDocument();
    expect(mockedUseOrganizationPermissions).toHaveBeenCalledWith(
      'org-1',
      false,
    );
  });

  it('renderiza la tabla de permisos cuando el usuario es ADMIN de una organización', () => {
    renderWithProviders(<PermissionsView />);

    expect(screen.getByText('Aprobar documentos')).toBeInTheDocument();
    expect(mockedUseOrganizationPermissions).toHaveBeenCalledWith(
      'org-1',
      true,
    );
  });

  it('crear permiso: abre el modal, escribe un nombre y llama a la mutación', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PermissionsView />);

    await user.click(screen.getByRole('button', { name: /crear permiso/i }));
    await user.type(screen.getByLabelText(/nombre/i), 'Nuevo permiso');
    await user.click(screen.getByRole('button', { name: /^crear$/i }));

    expect(createPermissionMutate).toHaveBeenCalledWith(
      'Nuevo permiso',
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('modificar: abre el modal, cambia el estatus y llama a la mutación con permissionId+changes', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PermissionsView />);

    const [rowActionsTrigger] = screen.getAllByRole('button', { name: '' });
    await user.click(rowActionsTrigger);
    await user.click(await screen.findByRole('menuitem', { name: /modificar/i }));

    expect(
      await screen.findByText(/actualiza el nombre o el estatus/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('switch'));
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(updatePermissionMutate).toHaveBeenCalledWith(
      {
        permissionId: 'perm-1',
        changes: { name: 'Aprobar documentos', isActive: false },
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('eliminar: abre el diálogo de confirmación y llama a la mutación con el permissionId', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PermissionsView />);

    const [rowActionsTrigger] = screen.getAllByRole('button', { name: '' });
    await user.click(rowActionsTrigger);
    await user.click(await screen.findByRole('menuitem', { name: /eliminar/i }));

    expect(
      await screen.findByText(/eliminar este permiso/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^eliminar$/i }));

    expect(deletePermissionMutate).toHaveBeenCalledWith(
      'perm-1',
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
