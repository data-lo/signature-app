import { renderWithProviders, screen } from '@/test-utils';

import { Can } from './Can';

describe('Can', () => {
  it('muestra sus hijos cuando el permiso está concedido', () => {
    renderWithProviders(
      <Can permission="BILLING.MANAGE">
        <button>Administrar plan</button>
      </Can>,
      { permissions: ['BILLING.READ', 'BILLING.MANAGE'] },
    );

    expect(
      screen.getByRole('button', { name: 'Administrar plan' }),
    ).toBeInTheDocument();
  });

  /**
   * El caso del ticket: `BILLING.READ` sin `BILLING.MANAGE` deja consultar pero no administrar.
   * Tener el permiso de la pantalla no arrastra el de la acción.
   */
  it('esconde sus hijos cuando falta el permiso', () => {
    renderWithProviders(
      <Can permission="BILLING.MANAGE">
        <button>Administrar plan</button>
      </Can>,
      { permissions: ['BILLING.READ'] },
    );

    expect(
      screen.queryByRole('button', { name: 'Administrar plan' }),
    ).not.toBeInTheDocument();
  });

  it('acepta varios permisos y basta con uno', () => {
    renderWithProviders(
      <Can anyOf={['DOCUMENT.READ_OWN', 'DOCUMENT.READ_ORGANIZATION']}>
        <span>Listado</span>
      </Can>,
      { permissions: ['DOCUMENT.READ_ORGANIZATION'] },
    );

    expect(screen.getByText('Listado')).toBeInTheDocument();
  });

  it('pinta el respaldo cuando lo hay', () => {
    renderWithProviders(
      <Can permission="MEMBER.INVITE" fallback={<span>Pídeselo a tu admin</span>}>
        <button>Invitar miembro</button>
      </Can>,
      { permissions: ['MEMBER.READ'] },
    );

    expect(screen.getByText('Pídeselo a tu admin')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Invitar miembro' }),
    ).not.toBeInTheDocument();
  });

  /**
   * El instante del cambio de cuenta: los permisos viejos ya se descartaron. Todo lo protegido
   * desaparece, que es lo que impide enseñar por un momento lo de la cuenta anterior.
   */
  it('sin permisos no muestra nada protegido', () => {
    renderWithProviders(
      <Can permission="DOCUMENT.CREATE">
        <button>Crear documento</button>
      </Can>,
      { permissions: [] },
    );

    expect(
      screen.queryByRole('button', { name: 'Crear documento' }),
    ).not.toBeInTheDocument();
  });
});
