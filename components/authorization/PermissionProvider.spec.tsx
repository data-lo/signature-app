import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { AuthorizationContext } from '@/lib/authorization/authorization.types';
import { usePermissions } from '@/lib/hooks/usePermissions';

import { PermissionProvider } from './PermissionProvider';

const ADMIN_CONTEXT: AuthorizationContext = {
  accountId: 'account-org',
  accountType: 'ORGANIZATION',
  organizationId: 'org-1',
  roleId: 'role-admin',
  roleName: 'ADMIN',
  permissions: ['BILLING.READ', 'BILLING.MANAGE', 'MEMBER.READ'],
};

const MEMBER_CONTEXT: AuthorizationContext = {
  accountId: 'account-personal',
  accountType: 'PERSONAL',
  organizationId: null,
  roleId: 'role-member',
  roleName: 'MEMBER',
  permissions: ['DOCUMENT.READ_OWN'],
};

function Probe() {
  const {
    authorization,
    can,
    canAny,
    canAll,
    isSwitchingAccount,
    clearAuthorization,
    applyAuthorization,
  } = usePermissions();

  return (
    <div>
      <p data-testid="cuenta">{authorization?.accountId ?? 'ninguna'}</p>
      <p data-testid="can">{String(can('BILLING.MANAGE'))}</p>
      <p data-testid="canAny">
        {String(canAny(['DOCUMENT.READ_OWN', 'BILLING.READ']))}
      </p>
      <p data-testid="canAll">
        {String(canAll(['BILLING.READ', 'BILLING.MANAGE']))}
      </p>
      <p data-testid="cambiando">{String(isSwitchingAccount)}</p>
      <button onClick={clearAuthorization}>Vaciar</button>
      <button onClick={() => applyAuthorization(MEMBER_CONTEXT)}>
        Adoptar
      </button>
    </div>
  );
}

describe('PermissionProvider', () => {
  it('hidrata en memoria el contexto que resolvió el servidor', () => {
    render(
      <PermissionProvider initialContext={ADMIN_CONTEXT}>
        <Probe />
      </PermissionProvider>,
    );

    expect(screen.getByTestId('cuenta')).toHaveTextContent('account-org');
    expect(screen.getByTestId('can')).toHaveTextContent('true');
    expect(screen.getByTestId('canAny')).toHaveTextContent('true');
    expect(screen.getByTestId('canAll')).toHaveTextContent('true');
  });

  /**
   * El criterio de la historia: nada de `localStorage` ni `sessionStorage`. Un permiso
   * persistido sobrevive al cambio de rol y de cuenta, y cualquiera puede editarlo para que la
   * interfaz le ofrezca acciones que el backend va a rechazar.
   */
  it('no deja rastro de los permisos en el almacenamiento del navegador', () => {
    render(
      <PermissionProvider initialContext={ADMIN_CONTEXT}>
        <Probe />
      </PermissionProvider>,
    );

    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it('adopta el contexto nuevo cuando el servidor vuelve a renderizar el layout', () => {
    const { rerender } = render(
      <PermissionProvider initialContext={ADMIN_CONTEXT}>
        <Probe />
      </PermissionProvider>,
    );

    rerender(
      <PermissionProvider initialContext={MEMBER_CONTEXT}>
        <Probe />
      </PermissionProvider>,
    );

    expect(screen.getByTestId('cuenta')).toHaveTextContent('account-personal');
    expect(screen.getByTestId('can')).toHaveTextContent('false');
  });

  it('al vaciarlo no concede nada y se anuncia como cambio en curso', async () => {
    render(
      <PermissionProvider initialContext={ADMIN_CONTEXT}>
        <Probe />
      </PermissionProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Vaciar' }));

    expect(screen.getByTestId('can')).toHaveTextContent('false');
    expect(screen.getByTestId('canAny')).toHaveTextContent('false');
    expect(screen.getByTestId('canAll')).toHaveTextContent('false');
    expect(screen.getByTestId('cambiando')).toHaveTextContent('true');
  });

  /**
   * Cerrar el cambio de cuenta con el contexto que ya devolvió el servidor, sin esperar al render
   * del layout. Es lo que permite que crear una organización navegue a Planes en cuanto la cuenta
   * activa es suya, en vez de pintarla con el hueco de "cambiando de cuenta".
   */
  it('adopta un contexto ya resuelto y da el cambio por cerrado', async () => {
    render(
      <PermissionProvider initialContext={ADMIN_CONTEXT}>
        <Probe />
      </PermissionProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Vaciar' }));
    expect(screen.getByTestId('cambiando')).toHaveTextContent('true');

    await userEvent.click(screen.getByRole('button', { name: 'Adoptar' }));

    expect(screen.getByTestId('cuenta')).toHaveTextContent('account-personal');
    expect(screen.getByTestId('canAny')).toHaveTextContent('true');
    expect(screen.getByTestId('cambiando')).toHaveTextContent('false');
  });
});

describe('usePermissions', () => {
  /**
   * Fuera del provider no se devuelve un contexto vacío: un componente que pregunta por permisos
   * donde nadie los proveyó está mal colocado, no "sin permisos", y responder `false` a todo lo
   * escondería como si fuera una pantalla legítimamente restringida.
   */
  it('lanza fuera del PermissionProvider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<Probe />)).toThrow(/PermissionProvider/);

    jest.restoreAllMocks();
  });
});
