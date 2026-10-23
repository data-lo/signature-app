import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CancelSubscriptionDialog from './CancelSubscriptionDialog';

const PERIOD_END = '2030-02-01T00:00:00.000Z';

function renderDialog(
  props: Partial<React.ComponentProps<typeof CancelSubscriptionDialog>> = {},
) {
  const onConfirm = jest.fn();
  render(
    <CancelSubscriptionDialog
      currentPeriodEnd={PERIOD_END}
      onConfirm={onConfirm}
      {...props}
    />,
  );
  return { onConfirm };
}

const tituloDelModal = { name: /¿cancelar tu suscripción\?/i };

describe('CancelSubscriptionDialog', () => {
  /**
   * El clic está a un pixel del resto de la tarjeta y la baja no se deshace sola: sin
   * confirmación, un clic accidental cancela la suscripción.
   */
  it('no confirma nada hasta que el usuario lo aprueba', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog();

    await user.click(
      screen.getByRole('button', { name: /cancelar suscripción/i }),
    );

    expect(
      await screen.findByRole('heading', tituloDelModal),
    ).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('avisa al confirmar y cierra el diálogo', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog();

    await user.click(
      screen.getByRole('button', { name: /cancelar suscripción/i }),
    );
    await user.click(
      await screen.findByRole('button', { name: /sí, cancelar/i }),
    );

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole('heading', tituloDelModal),
    ).not.toBeInTheDocument();
  });

  it('cierra sin confirmar si el usuario conserva su plan', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog();

    await user.click(
      screen.getByRole('button', { name: /cancelar suscripción/i }),
    );
    await user.click(
      await screen.findByRole('button', { name: /conservar mi plan/i }),
    );

    expect(onConfirm).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('heading', tituloDelModal),
    ).not.toBeInTheDocument();
  });

  /**
   * El texto tiene que decir la parte tranquilizadora: no se pierde lo ya pagado. La fecha se
   * calcula con el mismo formateo en vez de escribirse a mano, porque el periodo llega en UTC y
   * se muestra en la zona del navegador — un literal ataría la prueba a la zona de quien la corra.
   */
  it('anuncia hasta cuándo seguirá activo el plan y que se puede reanudar', async () => {
    const user = userEvent.setup();
    const fecha = new Date(PERIOD_END).toLocaleDateString('es-MX', {
      dateStyle: 'long',
    });
    renderDialog();

    await user.click(
      screen.getByRole('button', { name: /cancelar suscripción/i }),
    );

    expect(
      await screen.findByText(
        new RegExp(`seguirá activo hasta el ${fecha}`, 'i'),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/puedes reanudarla mientras el periodo siga vigente/i),
    ).toBeInTheDocument();
  });

  it('sin fecha de periodo lo dice sin inventarse un día', async () => {
    const user = userEvent.setup();
    renderDialog({ currentPeriodEnd: null });

    await user.click(
      screen.getByRole('button', { name: /cancelar suscripción/i }),
    );

    expect(
      await screen.findByText(/hasta el final del periodo que ya pagaste/i),
    ).toBeInTheDocument();
  });

  /** Mientras hay una operación en curso el disparador no debe poder abrir otra encima. */
  it('no se puede abrir mientras hay una operación en curso', async () => {
    renderDialog({ disabled: true });

    expect(
      screen.getByRole('button', { name: /cancelar suscripción/i }),
    ).toBeDisabled();
  });
});
