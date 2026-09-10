import userEvent from '@testing-library/user-event';
import { act, render, screen } from '@testing-library/react';
import AccountSwitcher from './AccountSwitcher';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { buildBillingAccess } from '@/lib/api/billing.fixtures';
import { ORGANIZATION_ACCOUNT_TOOLTIP } from '@/lib/hooks/useCanCreateOrganization';
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

/**
 * Deja en el store el estado comercial de una cuenta, que es de donde el selector saca si puede
 * ofrecer la creación de organizaciones (ver `useCanCreateOrganization`).
 */
function setBillingDe(accountId: string, organizationAccount: boolean) {
  useAuthStore.setState({
    billingByAccountId: {
      [accountId]: buildBillingAccess({
        currentPlanType: organizationAccount ? 'plus' : 'free',
        actions: { organizationAccount },
      }),
    },
  });
}

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
      billingByAccountId: {},
    });
    // Salvo que la prueba diga lo contrario, la cuenta activa tiene plan: lo que se mira en la
    // mayoría de los casos es el catálogo de cuentas, no el bloqueo comercial.
    setBillingDe(PERSONAL.id, true);
  });

  it('muestra "Cuenta" cuando activeAccount no coincide con ninguna entrada del catálogo', () => {
    setActiveAccount({ ...PERSONAL, id: 'no-existe' });
    render(<AccountSwitcher />);

    expect(screen.getByText('Cuenta')).toBeInTheDocument();
  });

  it('muestra "Mi cuenta personal" cuando la cuenta activa es PERSONAL', () => {
    setActiveAccount(PERSONAL);
    render(<AccountSwitcher />);

    expect(screen.getByText('Mi cuenta personal')).toBeInTheDocument();
  });

  it('muestra el nombre de la organización cuando la cuenta activa es ORGANIZATION', () => {
    setActiveAccount(ORG);
    render(<AccountSwitcher />);

    expect(screen.getByText('Acme Corp S.A. de C.V.')).toBeInTheDocument();
  });

  it('lista todas las cuentas del catálogo y marca la activa como "Actual"', async () => {
    const user = userEvent.setup();
    setActiveAccount(PERSONAL);
    render(<AccountSwitcher />);

    await user.click(screen.getByText('Mi cuenta personal'));

    const items = await screen.findAllByRole('menuitem');
    const labels = items.map((item) => item.textContent);
    expect(labels.some((label) => label?.includes('Mi cuenta personal'))).toBe(
      true,
    );
    expect(
      labels.some((label) => label?.includes('Acme Corp S.A. de C.V.')),
    ).toBe(true);

    const activePersonalItem = items.find((item) =>
      item.textContent?.includes('Mi cuenta personal'),
    );
    expect(activePersonalItem?.textContent).toContain('Actual');
  });

  it('al elegir otra cuenta, la vuelve la activa en el store', async () => {
    const user = userEvent.setup();
    setActiveAccount(PERSONAL);
    render(<AccountSwitcher />);

    await user.click(screen.getByText('Mi cuenta personal'));
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

    await user.click(screen.getByText('Mi cuenta personal'));
    await user.click(
      await screen.findByRole('menuitem', { name: /crear organización/i }),
    );

    expect(push).toHaveBeenCalledWith('/dashboard/organization/create');
  });

  /**
   * La cuenta empresarial se paga. El bloqueo de acá es sólo experiencia de usuario —quien
   * autoriza es el endpoint—, pero es el que evita mandar a llenar un formulario que va a
   * terminar en un 403.
   */
  describe('creación de organizaciones según el plan', () => {
    async function openMenu(user: ReturnType<typeof userEvent.setup>) {
      await user.click(screen.getByText('Mi cuenta personal'));
      return screen.findByRole('menuitem', { name: /crear organización/i });
    }

    it('deshabilita la opción cuando el plan no incluye la cuenta empresarial', async () => {
      const user = userEvent.setup();
      setActiveAccount(PERSONAL);
      setBillingDe(PERSONAL.id, false);
      render(<AccountSwitcher />);

      expect(await openMenu(user)).toHaveAttribute('aria-disabled', 'true');
    });

    it('no navega al pulsar la opción deshabilitada', async () => {
      const user = userEvent.setup();
      setActiveAccount(PERSONAL);
      setBillingDe(PERSONAL.id, false);
      render(<AccountSwitcher />);

      await user.click(await openMenu(user));

      expect(push).not.toHaveBeenCalled();
    });

    /** El tooltip es la única explicación que recibe el usuario, así que dice exactamente esto. */
    it('explica el bloqueo al pasar el cursor', async () => {
      const user = userEvent.setup();
      setActiveAccount(PERSONAL);
      setBillingDe(PERSONAL.id, false);
      render(<AccountSwitcher />);

      await user.hover(await openMenu(user));

      expect(
        await screen.findByText(ORGANIZATION_ACCOUNT_TOOLTIP),
      ).toBeInTheDocument();
    });

    /** Con teclado tiene que decir lo mismo: por eso el bloqueo no usa `disabled`. */
    it('explica el bloqueo también al enfocar con el teclado', async () => {
      const user = userEvent.setup();
      setActiveAccount(PERSONAL);
      setBillingDe(PERSONAL.id, false);
      render(<AccountSwitcher />);

      const option = await openMenu(user);
      // El foco lo mueve el menú por dentro (navegación por lista), así que va envuelto en `act`.
      await act(async () => option.focus());

      expect(
        await screen.findByText(ORGANIZATION_ACCOUNT_TOOLTIP),
      ).toBeInTheDocument();
    });

    it('habilita la opción cuando el plan sí la incluye', async () => {
      const user = userEvent.setup();
      setActiveAccount(PERSONAL);
      setBillingDe(PERSONAL.id, true);
      render(<AccountSwitcher />);

      const option = await openMenu(user);

      expect(option).not.toHaveAttribute('aria-disabled', 'true');
      expect(
        screen.queryByText(ORGANIZATION_ACCOUNT_TOOLTIP),
      ).not.toBeInTheDocument();
    });

    /**
     * El estado comercial vive indexado por cuenta, así que cambiar de cuenta activa recalcula
     * el bloqueo sin ningún efecto explícito ni petición nueva. Es el caso de quien tiene su
     * cuenta personal en Free y una organización con plan.
     */
    it('recalcula el estado al cambiar de cuenta activa', async () => {
      const user = userEvent.setup();
      setActiveAccount(PERSONAL);
      useAuthStore.setState({
        billingByAccountId: {
          [PERSONAL.id]: buildBillingAccess({
            currentPlanType: 'free',
            actions: { organizationAccount: false },
          }),
          [ORG.id]: buildBillingAccess({
            currentPlanType: 'plus',
            actions: { organizationAccount: true },
          }),
        },
      });
      render(<AccountSwitcher />);

      expect(await openMenu(user)).toHaveAttribute('aria-disabled', 'true');

      await user.click(
        await screen.findByRole('menuitem', {
          name: /acme corp s\.a\. de c\.v\./i,
        }),
      );
      await user.click(screen.getByText('Acme Corp S.A. de C.V.'));

      expect(
        await screen.findByRole('menuitem', { name: /crear organización/i }),
      ).not.toHaveAttribute('aria-disabled', 'true');
    });
  });
});
