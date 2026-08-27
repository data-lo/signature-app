import { render, screen } from '@testing-library/react';
import VerificationQrPanel from './VerificationQrPanel';

const URL = 'https://verify.didit.me/session/abc';

/**
 * Distribución de la tarjeta "Identidad con Didit · en proceso": el QR y sus dos acciones van
 * centrados horizontalmente, y el texto instructivo se queda alineado a la izquierda.
 *
 * Se afirma sobre las clases y no sobre posiciones porque jsdom no calcula layout. Es suficiente
 * para lo que se quiere evitar —que alguien quite el centrado sin darse cuenta— y no depende de
 * pixeles, que cambiarían con el tamaño del QR o del contenedor.
 */
describe('VerificationQrPanel · distribución', () => {
  it('centra el código QR dentro de la tarjeta', () => {
    render(<VerificationQrPanel url={URL} />);

    const qr = screen.getByLabelText(/código qr para continuar/i);
    const row = qr.closest('div')?.parentElement;

    expect(row).toHaveClass('flex', 'justify-center');
  });

  it('centra las dos acciones asociadas al QR', () => {
    render(<VerificationQrPanel url={URL} />);

    const row = screen
      .getByRole('link', { name: /abrir verificación/i })
      .parentElement;

    expect(row).toHaveClass('flex', 'justify-center');
    // Las dos salidas del flujo comparten la misma fila centrada.
    expect(row).toContainElement(
      screen.getByRole('button', { name: /copiar enlace/i }),
    );
  });

  /**
   * El texto instructivo conserva la alineación a la izquierda: centrarlo junto con el QR haría
   * más difícil leerlo de corrido, que es justo lo que tiene que pasar antes de escanear.
   */
  it('deja el texto instructivo alineado a la izquierda', () => {
    render(<VerificationQrPanel url={URL} />);

    const instructions = screen.getByText(/escanea el qr con tu celular/i);

    expect(instructions.className).not.toMatch(/text-center|justify-center/);
  });
});
