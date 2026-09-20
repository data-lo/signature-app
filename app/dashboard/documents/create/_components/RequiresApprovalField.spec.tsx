import userEvent from '@testing-library/user-event';
import { useForm, useWatch, type Control } from 'react-hook-form';
import { act, renderWithProviders, screen } from '@/test-utils';
import RequiresApprovalField from './RequiresApprovalField';
import { useDocumentApprovers } from '../_hooks/useDocumentApprovers';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type { ActiveAccount } from '@/lib/store/types/auth-store.types';
import type { CreateDocumentSignaturesFormValues } from '../_schemas';

/**
 * El selector de aprobador se monta dentro de este campo, así que su consulta llegaría hasta React
 * Query. Se dobla el hook —y no la petición— porque lo que esta suite comprueba es el checkbox y
 * lo que arrastra consigo; los estados de la consulta son de `ApproverUserField.spec`.
 */
jest.mock('../_hooks/useDocumentApprovers', () => ({
  ...jest.requireActual('../_hooks/useDocumentApprovers'),
  useDocumentApprovers: jest.fn(),
}));

const mockedUseDocumentApprovers = useDocumentApprovers as jest.Mock;

function buildActiveAccount(
  overrides: Partial<ActiveAccount> = {},
): ActiveAccount {
  return {
    id: 'account-1',
    accountType: 'ORGANIZATION',
    organizationId: 'org-1',
    roleId: 'admin-role-1',
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

function Harness({
  defaultValue = false,
  reviewerUserId = null,
}: {
  defaultValue?: boolean;
  reviewerUserId?: string | null;
}) {
  const { control } = useForm<CreateDocumentSignaturesFormValues>({
    defaultValues: {
      requiresApproval: defaultValue,
      reviewerUserId,
      includeMeAsSigner: false,
      requiresOrder: false,
      collaborators: [],
    },
  });

  return (
    <>
      <RequiresApprovalField control={control} />
      <ReviewerUserIdOutput control={control} />
    </>
  );
}

describe('RequiresApprovalField', () => {
  beforeEach(() => {
    mockedUseDocumentApprovers.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [{ value: 'user-aprobador', label: 'ana@empresa.com' }],
    });
  });

  it('bug corregido: en una cuenta PERSONAL, la opción no se muestra', () => {
    useAuthStore.setState({
      activeAccount: buildActiveAccount({
        accountType: 'PERSONAL',
        organizationId: null,
      }),
    });

    renderWithProviders(<Harness />);

    expect(
      screen.queryByRole('checkbox', { name: /requiere aprobación/i }),
    ).not.toBeInTheDocument();
  });

  it('en una cuenta ORGANIZATION, la opción se muestra', () => {
    useAuthStore.setState({ activeAccount: buildActiveAccount() });

    renderWithProviders(<Harness />);

    expect(
      screen.getByRole('checkbox', { name: /requiere aprobación/i }),
    ).toBeInTheDocument();
  });

  it('bug corregido: si la cuenta activa cambia a PERSONAL con el valor ya en true, se fuerza a false (no solo se oculta)', () => {
    useAuthStore.setState({ activeAccount: buildActiveAccount() });
    const { rerender } = renderWithProviders(<Harness defaultValue />);

    expect(
      screen.getByRole('checkbox', { name: /requiere aprobación/i }),
    ).toHaveAttribute('data-checked');

    act(() => {
      useAuthStore.setState({
        activeAccount: buildActiveAccount({
          accountType: 'PERSONAL',
          organizationId: null,
        }),
      });
    });
    rerender(<Harness defaultValue />);

    expect(
      screen.queryByRole('checkbox', { name: /requiere aprobación/i }),
    ).not.toBeInTheDocument();

    // Vuelve a ORGANIZATION sin recargar: si el valor no se hubiera forzado a false al
    // ocultarse, reaparecería ya marcado.
    act(() => {
      useAuthStore.setState({ activeAccount: buildActiveAccount() });
    });
    rerender(<Harness defaultValue />);

    expect(
      screen.getByRole('checkbox', { name: /requiere aprobación/i }),
    ).toHaveAttribute('data-unchecked');
  });

  /**
   * Historia "Implementar flujo de aprobación previo al proceso de firma": marcar la opción obliga
   * a decir a quién se le pide la aprobación, y desmarcarla no puede dejar esa elección escondida
   * en los valores del formulario — el backend rechaza el payload que trae aprobador diciendo a la
   * vez que no requiere aprobación.
   */
  describe('aprobador', () => {
    it('sin la opción marcada no hay selector', () => {
      useAuthStore.setState({ activeAccount: buildActiveAccount() });

      renderWithProviders(<Harness />);

      expect(
        screen.queryByRole('combobox', { name: /usuario aprobador/i }),
      ).not.toBeInTheDocument();
    });

    it('al marcarla aparece el selector de aprobador', async () => {
      const user = userEvent.setup();
      useAuthStore.setState({ activeAccount: buildActiveAccount() });

      renderWithProviders(<Harness />);
      await user.click(
        screen.getByRole('checkbox', { name: /requiere aprobación/i }),
      );

      expect(
        screen.getByRole('combobox', { name: /usuario aprobador/i }),
      ).toBeInTheDocument();
    });

    it('al desmarcarla, el aprobador ya elegido se descarta', async () => {
      const user = userEvent.setup();
      useAuthStore.setState({ activeAccount: buildActiveAccount() });

      renderWithProviders(
        <Harness defaultValue reviewerUserId="user-aprobador" />,
      );
      expect(screen.getByText('user-aprobador')).toBeInTheDocument();

      await user.click(
        screen.getByRole('checkbox', { name: /requiere aprobación/i }),
      );

      expect(screen.getByText('sin aprobador')).toBeInTheDocument();
      expect(
        screen.queryByRole('combobox', { name: /usuario aprobador/i }),
      ).not.toBeInTheDocument();
    });
  });
});
