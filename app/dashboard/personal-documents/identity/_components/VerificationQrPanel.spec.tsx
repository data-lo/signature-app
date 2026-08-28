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

  /**
   * El QR es la ÚNICA salida hacia Didit. La tarjeta ofrecía además "Abrir verificación" y
   * "Copiar enlace", y las dos se retiraron junto con el rótulo que mostraba la URL: escanear con
   * el celular es el camino previsto —ahí están la cámara y la selfie— y sostener tres caminos
   * para lo mismo obligaba a explicar en pantalla cuál convenía.
   */
  it('no ofrece abrir ni copiar el enlace: el QR es la única salida', () => {
    render(<VerificationQrPanel url={URL} />);

    expect(
      screen.queryByRole('link', { name: /abrir verificación/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /copiar enlace/i }),
    ).not.toBeInTheDocument();
    // La URL viaja para poder codificarla, pero no se muestra en ninguna parte.
    expect(screen.queryByText(URL)).not.toBeInTheDocument();
  });

  /**
   * El texto instructivo conserva la alineación a la izquierda: centrarlo junto con el QR haría
   * más difícil leerlo de corrido, que es justo lo que tiene que pasar antes de escanear.
   */
  it('deja el texto instructivo alineado a la izquierda', () => {
    render(<VerificationQrPanel url={URL} />);

    const instructions = screen.getByText(/escanea el código qr/i);

    expect(instructions.className).not.toMatch(/text-center|justify-center/);
  });
});
