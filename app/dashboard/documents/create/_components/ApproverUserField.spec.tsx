import userEvent from '@testing-library/user-event';
import { useForm, useWatch, type Control } from 'react-hook-form';
import { renderWithProviders, screen, waitFor } from '@/test-utils';
import {
  getOrganizationMembersRequest,
  type OrganizationMember,
} from '@/lib/api/organization-members';
import type { RolePermission } from '@/lib/api/roles';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type { CreateDocumentSignaturesFormValues } from '../_schemas';
import ApproverUserField, {
  APPROVERS_ERROR_MESSAGE,
  NO_APPROVERS_MESSAGE,
} from './ApproverUserField';

jest.mock('@/lib/api/organization-members');

const mockedGetOrganizationMembers = getOrganizationMembersRequest as jest.Mock;

function permission(key: string): RolePermission {
  return {
    id: `permission-${key}`,
    key,
    resource: key.split('.')[0],
    action: key.split('.')[1],
    scope: 'ORGANIZATION',
    description: key,
    isStaticCatalog: true,
  };
}

function member(
  overrides: Partial<OrganizationMember> = {},
): OrganizationMember {
  return {
    accountId: 'account-1',
    userId: 'user-1',
    email: 'ana@empresa.com',
    rfc: null,
    role: { id: 'role-1', name: 'Aprobador' },
    joinedAt: '2026-01-01T00:00:00Z',
    status: 'active',
    isActive: true,
    permissions: [permission('DOCUMENT.APPROVE')],
    ...overrides,
  };
}

/** El valor que el formulario prepara para el envío, visible para poder afirmar sobre él. */
function ReviewerUserIdOutput({
  control,
}: {
  control: Control<CreateDocumentSignaturesFormValues>;
}) {
  const reviewerUserId = useWatch({ control, name: 'reviewerUserId' });

  return <output>{reviewerUserId ?? 'sin aprobador'}</output>;
}

function Harness({ requiresApproval = true }: { requiresApproval?: boolean }) {
  const { control } = useForm<CreateDocumentSignaturesFormValues>({
    defaultValues: {
      requiresApproval,
      reviewerUserId: null,
      includeMeAsSigner: false,
      requiresOrder: false,
      collaborators: [],
    },
  });

  return (
    <>
      <ApproverUserField control={control} />
      <ReviewerUserIdOutput control={control} />
    </>
  );
}

describe('ApproverUserField', () => {
  beforeEach(() => {
    mockedGetOrganizationMembers.mockReset();
    useAuthStore.setState({
      activeAccount: {
        id: 'account-1',
        accountType: 'ORGANIZATION',
        organizationId: 'org-1',
        roleId: 'role-1',
      },
    });
  });

  it('con "Requiere aprobación" desactivado no consulta nada ni muestra selector', async () => {
    renderWithProviders(<Harness requiresApproval={false} />);

    await waitFor(() =>
      expect(screen.getByText('sin aprobador')).toBeInTheDocument(),
    );
    expect(mockedGetOrganizationMembers).not.toHaveBeenCalled();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('con la opción activa consulta a los miembros de la organización activa', async () => {
    mockedGetOrganizationMembers.mockResolvedValue([member()]);

    renderWithProviders(<Harness />);

    await waitFor(() =>
      expect(mockedGetOrganizationMembers).toHaveBeenCalledWith('org-1'),
    );
  });

  it('lista solo a los miembros con permiso para aprobar documentos', async () => {
    const user = userEvent.setup();
    mockedGetOrganizationMembers.mockResolvedValue([
      member(),
      member({
        accountId: 'account-2',
        userId: 'user-2',
        email: 'beto@empresa.com',
        permissions: [permission('DOCUMENT.CREATE')],
      }),
    ]);

    renderWithProviders(<Harness />);
    const combobox = await screen.findByRole('combobox', {
      name: /usuario aprobador/i,
    });

    combobox.focus();
    await user.keyboard('{Enter}');

    expect(
      await screen.findByRole('option', { name: /ana@empresa\.com/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: /beto@empresa\.com/i }),
    ).not.toBeInTheDocument();
  });

  it('deja fuera a quien todavía no ha aceptado la invitación o ya no es miembro', async () => {
    mockedGetOrganizationMembers.mockResolvedValue([
      member({ status: 'pending_invite' }),
      member({
        accountId: 'account-2',
        userId: 'user-2',
        status: 'removed',
        isActive: false,
      }),
    ]);

    renderWithProviders(<Harness />);

    expect(await screen.findByText(NO_APPROVERS_MESSAGE)).toBeInTheDocument();
  });

  it('sin usuarios aprobadores muestra el mensaje de la historia y ningún selector', async () => {
    mockedGetOrganizationMembers.mockResolvedValue([]);

    renderWithProviders(<Harness />);

    expect(await screen.findByText(NO_APPROVERS_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('al elegir un aprobador, el formulario prepara su userId', async () => {
    const user = userEvent.setup();
    mockedGetOrganizationMembers.mockResolvedValue([member()]);

    renderWithProviders(<Harness />);
    const combobox = await screen.findByRole('combobox', {
      name: /usuario aprobador/i,
    });

    expect(screen.getByText('sin aprobador')).toBeInTheDocument();
    combobox.focus();
    await user.keyboard('{Enter}');
    await user.click(
      await screen.findByRole('option', { name: /ana@empresa\.com/i }),
    );

    // `userId`, no `accountId`: es el usuario quien aprueba, la membresía sólo prueba que puede.
    expect(await screen.findByText('user-1')).toBeInTheDocument();
  });

  it('si la consulta falla, lo dice en vez de hacerlo pasar por "no hay aprobadores"', async () => {
    mockedGetOrganizationMembers.mockRejectedValue(new Error('403'));

    renderWithProviders(<Harness />);

    expect(
      await screen.findByText(APPROVERS_ERROR_MESSAGE),
    ).toBeInTheDocument();
    expect(screen.queryByText(NO_APPROVERS_MESSAGE)).not.toBeInTheDocument();
  });
});
