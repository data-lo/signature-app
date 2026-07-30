import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import AccountSwitcher from './AccountSwitcher';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type {
  AccountListEntry,
  ActiveAccount,
} from '@/lib/store/types/auth-store.types';

const push = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

const PERSONAL: AccountListEntry = {
  id: 'personal-1',
  accountType: 'PERSONAL',
  organizationId: null,
  organizationName: null,
  roleId: 'OWNER',
  status: 'ACTIVE',
};

const ORG: AccountListEntry = {
  id: 'org-1',
  accountType: 'ORGANIZATION',
  organizationId: 'org-1',
  organizationName: 'Acme Corp S.A. de C.V.',
  roleId: 'OWNER',
  status: 'ACTIVE',
};

function setActiveAccount(entry: AccountListEntry | null) {
  const activeAccount: ActiveAccount | null = entry
    ? {
        id: entry.id,
        accountType: entry.accountType,
        organizationId: entry.organizationId,
        roleId: entry.roleId,
      }
    : null;
  useAuthStore.setState({ activeAccount });
}

describe('AccountSwitcher', () => {
  beforeEach(() => {
    push.mockReset();
    useAuthStore.setState({
      accountsList: [PERSONAL, ORG],
      activeAccount: null,
    });
  });

  it('muestra "Cuenta" cuando activeAccount no coincide con ninguna entrada del catálogo', () => {
    setActiveAccount({ ...PERSONAL, id: 'no-existe' });
    render(<AccountSwitcher />);

    expect(screen.getByText('Cuenta')).toBeInTheDocument();
  });

  it('muestra "Cuenta personal" cuando la cuenta activa es PERSONAL', () => {
    setActiveAccount(PERSONAL);
    render(<AccountSwitcher />);

    expect(screen.getByText('Cuenta personal')).toBeInTheDocument();
  });

  it('muestra el nombre de la organización cuando la cuenta activa es ORGANIZATION', () => {
    setActiveAccount(ORG);
    render(<AccountSwitcher />);

    expect(screen.getByText('Acme Corp S.A. de C.V.')).toBeInTheDocument();
  });

  it('lista todas las cuentas del catálogo y marca la activa como "Activa"', async () => {
    const user = userEvent.setup();
    setActiveAccount(PERSONAL);
    render(<AccountSwitcher />);

    await user.click(screen.getByText('Cuenta personal'));

    const items = await screen.findAllByRole('menuitem');
    const labels = items.map((item) => item.textContent);
    expect(labels.some((label) => label?.includes('Cuenta personal'))).toBe(
      true,
    );
    expect(
      labels.some((label) => label?.includes('Acme Corp S.A. de C.V.')),
    ).toBe(true);

    const activePersonalItem = items.find((item) =>
      item.textContent?.includes('Cuenta personal'),
    );
    expect(activePersonalItem?.textContent).toContain('Activa');
  });

  it('al elegir otra cuenta, la vuelve la activa en el store', async () => {
    const user = userEvent.setup();
    setActiveAccount(PERSONAL);
    render(<AccountSwitcher />);

    await user.click(screen.getByText('Cuenta personal'));
    await user.click(
      await screen.findByRole('menuitem', {
        name: /acme corp s\.a\. de c\.v\./i,
      }),
    );

    expect(useAuthStore.getState().activeAccount?.id).toBe('org-1');
  });

  it('"Crear organización" navega a /organization/create', async () => {
    const user = userEvent.setup();
    setActiveAccount(PERSONAL);
    render(<AccountSwitcher />);

    await user.click(screen.getByText('Cuenta personal'));
    await user.click(
      await screen.findByRole('menuitem', { name: /crear organización/i }),
    );

    expect(push).toHaveBeenCalledWith('/dashboard/organization/create');
  });
});
