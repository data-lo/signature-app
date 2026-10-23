import userEvent from '@testing-library/user-event';

import { render, screen, waitFor } from '@/test-utils';
import DocumentFileName, { isTextTruncated } from './DocumentFileName';

const LONG_NAME = 'Contrato de prestación de servicios profesionales 2026.pdf';
const SHORT_NAME = 'contrato.pdf';

/**
 * jsdom no maqueta: `scrollWidth` y `clientWidth` valen 0 siempre. Se fijan a mano para simular
 * un nombre que no cabe (`scrollWidth` > `clientWidth`) o uno que sí.
 */
function simulateWidths({
  scrollWidth,
  clientWidth,
}: {
  scrollWidth: number;
  clientWidth: number;
}) {
  jest
    .spyOn(HTMLElement.prototype, 'scrollWidth', 'get')
    .mockReturnValue(scrollWidth);
  jest
    .spyOn(HTMLElement.prototype, 'clientWidth', 'get')
    .mockReturnValue(clientWidth);
}

const TRUNCATED = { scrollWidth: 480, clientWidth: 240 };
const FITS = { scrollWidth: 96, clientWidth: 240 };

function tooltip() {
  return document.querySelector('[data-slot="tooltip-content"]');
}

describe('DocumentFileName', () => {
  afterEach(() => jest.restoreAllMocks());

  /**
   * El recorte es CSS puro: `truncate` = `overflow: hidden` + `text-overflow: ellipsis` +
   * `white-space: nowrap`. Una sola línea es lo que evita que un nombre largo cambie la altura
   * de la fila, y `w-full min-w-0` lo que lo ciñe al ancho de la columna.
   */
  it('muestra el nombre en una sola línea recortable dentro del ancho disponible', () => {
    render(<DocumentFileName fileName={LONG_NAME} interactive />);

    const name = screen.getByRole('button', { name: LONG_NAME });
    expect(name).toHaveClass('truncate', 'block', 'w-full', 'min-w-0');
    expect(name).not.toHaveClass('whitespace-normal', 'break-words');
    // El recorte es visual: el texto del DOM sigue siendo el nombre completo.
    expect(name).toHaveTextContent(LONG_NAME);
  });

  it('un nombre recortado muestra el nombre completo en un tooltip al pasar el cursor', async () => {
    simulateWidths(TRUNCATED);
    const user = userEvent.setup();
    render(<DocumentFileName fileName={LONG_NAME} interactive />);

    await user.hover(screen.getByRole('button', { name: LONG_NAME }));

    expect(
      await screen.findByText(LONG_NAME, {
        selector: '[data-slot="tooltip-content"]',
      }),
    ).toBeVisible();
  });

  it('el tooltip también se abre al enfocar el nombre con el teclado', async () => {
    simulateWidths(TRUNCATED);
    const user = userEvent.setup();
    render(<DocumentFileName fileName={LONG_NAME} interactive />);

    await user.tab();
    expect(screen.getByRole('button', { name: LONG_NAME })).toHaveFocus();

    expect(
      await screen.findByText(LONG_NAME, {
        selector: '[data-slot="tooltip-content"]',
      }),
    ).toBeVisible();
  });

  /** Un nombre que cabe se lee entero en la celda: repetirlo en un globo sería ruido. */
  it('un nombre corto se muestra completo y sin tooltip', async () => {
    simulateWidths(FITS);
    const user = userEvent.setup();
    render(<DocumentFileName fileName={SHORT_NAME} interactive />);

    const name = screen.getByRole('button', { name: SHORT_NAME });
    expect(name).toHaveTextContent(SHORT_NAME);

    await user.hover(name);
    await user.tab();

    // Se da tiempo al retraso de apertura del tooltip antes de afirmar que no apareció.
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(tooltip()).toBeNull();
  });

  it('el tooltip se cierra al retirar el cursor', async () => {
    simulateWidths(TRUNCATED);
    const user = userEvent.setup();
    render(<DocumentFileName fileName={LONG_NAME} interactive />);
    const name = screen.getByRole('button', { name: LONG_NAME });

    await user.hover(name);
    await screen.findByText(LONG_NAME, {
      selector: '[data-slot="tooltip-content"]',
    });
    await user.unhover(name);

    await waitFor(() => expect(tooltip()).toBeNull());
  });

  /**
   * Sin navegación la fila no es un control: el nombre no se anuncia como botón, pero sigue
   * siendo enfocable para que el tooltip se alcance con el teclado.
   */
  it('sin navegación no es un botón, pero sigue abriendo el tooltip con el foco', async () => {
    simulateWidths(TRUNCATED);
    const user = userEvent.setup();
    render(<DocumentFileName fileName={LONG_NAME} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    await user.tab();
    const name = screen.getByText(LONG_NAME, {
      selector: '[data-slot="tooltip-trigger"]',
    });
    expect(name).toHaveFocus();
    expect(name).not.toHaveClass('hover:underline');

    expect(
      await screen.findByText(LONG_NAME, {
        selector: '[data-slot="tooltip-content"]',
      }),
    ).toBeVisible();
  });

  it('un nombre sin espacios se parte dentro del tooltip en vez de desbordarlo', async () => {
    simulateWidths(TRUNCATED);
    const user = userEvent.setup();
    const unbrokenName = `${'contrato_prestacion_servicios_'.repeat(4)}2026.pdf`;
    render(<DocumentFileName fileName={unbrokenName} interactive />);

    await user.hover(screen.getByRole('button', { name: unbrokenName }));

    expect(
      await screen.findByText(unbrokenName, {
        selector: '[data-slot="tooltip-content"]',
      }),
    ).toHaveClass('break-words', 'max-w-xs');
  });
});

describe('isTextTruncated', () => {
  function elementWith(scrollWidth: number, clientWidth: number) {
    const element = document.createElement('span');
    Object.defineProperty(element, 'scrollWidth', { value: scrollWidth });
    Object.defineProperty(element, 'clientWidth', { value: clientWidth });
    return element;
  }

  it('es verdadero sólo cuando el contenido es más ancho que lo visible', () => {
    expect(isTextTruncated(elementWith(300, 200))).toBe(true);
    expect(isTextTruncated(elementWith(200, 200))).toBe(false);
    expect(isTextTruncated(elementWith(100, 200))).toBe(false);
  });

  it('sin elemento montado no hay recorte', () => {
    expect(isTextTruncated(null)).toBe(false);
  });
});
