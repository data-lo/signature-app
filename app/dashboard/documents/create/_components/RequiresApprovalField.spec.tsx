import { useForm } from 'react-hook-form';
import { act, renderWithProviders, screen } from '@/test-utils';
import RequiresApprovalField from './RequiresApprovalField';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type { ActiveAccount } from '@/lib/store/types/auth-store.types';
import type { CreateDocumentSignaturesFormValues } from '../_schemas';

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

function Harness({ defaultValue = false }: { defaultValue?: boolean }) {
  const { control } = useForm<CreateDocumentSignaturesFormValues>({
    defaultValues: {
      requiresApproval: defaultValue,
      includeMeAsSigner: false,
      requiresOrder: false,
      collaborators: [],
    },
  });

  return <RequiresApprovalField control={control} />;
}

describe('RequiresApprovalField', () => {
  it('bug corregido: en una cuenta PERSONAL, la opción no se muestra', () => {
    useAuthStore.setState({
      activeAccount: buildActiveAccount({ accountType: 'PERSONAL', organizationId: null }),
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
});
