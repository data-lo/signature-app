import { render, screen } from '@testing-library/react';
import VerificationQrPanel from './VerificationQrPanel';

const URL = 'https://verify.didit.me/session/abc';

/**
 * Distribución de la tarjeta "Identidad con Didit · en proceso": el QR va centrado, el texto
 * instructivo alineado a la izquierda y la acción al final, a la derecha.
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
   * Historia "Restaurar botón para abrir enlace de verificación QR": escanear el código de la
   * propia pantalla con esa misma pantalla es imposible, así que quien ya está en el dispositivo
   * desde el que quiere verificarse se quedaba sin camino.
   */
  it('ofrece abrir la verificación en el enlace correcto', () => {
    render(<VerificationQrPanel url={URL} />);

    const link = screen.getByRole('link', { name: /abrir verificación/i });

    expect(link).toHaveAttribute('href', URL);
    // Pestaña nueva y sin exponer `window.opener`: el destino es un dominio externo.
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  /** Mismo componente que el resto de acciones de la app, no un enlace suelto con estilos. */
  it('usa el botón compartido de la aplicación', () => {
    render(<VerificationQrPanel url={URL} />);

    expect(
      screen.getByRole('link', { name: /abrir verificación/i }),
    ).toHaveAttribute('data-slot', 'button');
  });

  /** Criterio: al final de la sección, alineado abajo a la derecha. */
  it('coloca la acción al final y alineada a la derecha', () => {
    const { container } = render(<VerificationQrPanel url={URL} />);

    const row = screen.getByRole('link', {
      name: /abrir verificación/i,
    }).parentElement;

    expect(row).toHaveClass('flex', 'justify-end');
    // Última fila de la tarjeta: nada la sigue.
    expect(container.firstElementChild?.lastElementChild).toBe(row);
  });

  /**
   * "Copiar enlace" NO vuelve: no abre nada por sí solo y era el tercer camino para lo mismo, que
   * obligaba a explicar en pantalla cuál convenía.
   */
  it('no reintroduce la acción de copiar el enlace', () => {
    render(<VerificationQrPanel url={URL} />);

    expect(
      screen.queryByRole('button', { name: /copiar enlace/i }),
    ).not.toBeInTheDocument();
    // La URL se codifica y se enlaza, pero no se muestra como texto.
    expect(screen.queryByText(URL)).not.toBeInTheDocument();
  });

  /**
   * Estado seguro. Se ocultan LOS DOS, no sólo el botón: un QR que codifica algo que no es una
   * URL no inicia ninguna verificación, y enseñarlo haría creer al usuario que falla su cámara.
   *
   * El esquema ejecutable está en la lista porque la URL viene de un proveedor externo y termina
   * en el `href` de un enlace: con ese esquema se ejecutaría al pulsarlo.
   */
  it.each([
    ['vacía', ''],
    ['no es una URL', 'no-es-una-url'],
    ['relativa', '/session/abc'],
    ['con esquema ejecutable', 'javascript:alert(1)'],
  ])('con una URL %s no dibuja ni el QR ni el botón', (_caso, url) => {
    render(<VerificationQrPanel url={url} />);

    expect(
      screen.queryByLabelText(/código qr para continuar/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /abrir verificación/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/no se pudo generar el enlace de verificación/i),
    ).toBeInTheDocument();
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
