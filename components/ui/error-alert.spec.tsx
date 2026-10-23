import { render, screen } from '@testing-library/react';

import { ErrorAlert, hasErrorMessage } from './error-alert';

describe('ErrorAlert', () => {
  it('con título, muestra el título y el mensaje dentro de un aviso destructivo', () => {
    render(
      <ErrorAlert
        title="No se pudo enviar"
        message="Selecciona la ubicación de la firma."
      />,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('data-slot', 'alert');
    expect(alert).toHaveClass('text-destructive');
    expect(alert.querySelector('[data-slot="alert-title"]')).toHaveTextContent(
      'No se pudo enviar',
    );
    expect(
      alert.querySelector('[data-slot="alert-description"]'),
    ).toHaveTextContent('Selecciona la ubicación de la firma.');
  });

  it('sin título, muestra sólo el mensaje', () => {
    render(<ErrorAlert message="Selecciona la ubicación de la firma." />);

    const alert = screen.getByRole('alert');
    expect(alert.querySelector('[data-slot="alert-title"]')).toBeNull();
    expect(alert).toHaveTextContent('Selecciona la ubicación de la firma.');
  });

  it('un título vacío se trata como ausente', () => {
    render(<ErrorAlert title="  " message="Algo salió mal." />);

    expect(
      screen.getByRole('alert').querySelector('[data-slot="alert-title"]'),
    ).toBeNull();
  });

  it('acepta contenido enriquecido como mensaje', () => {
    render(
      <ErrorAlert
        message={
          <p>
            Falta: <strong>Juan Pérez</strong>
          </p>
        }
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Falta: Juan Pérez');
  });

  it('el ícono es decorativo', () => {
    render(<ErrorAlert message="Algo salió mal." />);

    expect(screen.getByRole('alert').querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  describe('mensaje obligatorio', () => {
    it.each([
      ['vacío', ''],
      ['de puros espacios', '   '],
      ['null', null],
      ['undefined', undefined],
    ])('con un mensaje %s no renderiza nada', (_label, message) => {
      const { container } = render(
        <ErrorAlert title="No se pudo enviar" message={message} />,
      );

      expect(container).toBeEmptyDOMElement();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('el tipo exige `message`', () => {
      // @ts-expect-error -- `message` es obligatorio; si deja de serlo, esta línea no compila.
      const { container } = render(<ErrorAlert title="No se pudo enviar" />);

      expect(container).toBeEmptyDOMElement();
    });
  });
});

describe('hasErrorMessage', () => {
  it.each([
    ['', false],
    ['   ', false],
    [null, false],
    [undefined, false],
    [false, false],
    ['Algo salió mal.', true],
    [0, true],
    [<span key="x">Algo</span>, true],
  ])('%p → %p', (message, expected) => {
    expect(hasErrorMessage(message)).toBe(expected);
  });
});
