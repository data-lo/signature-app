import { render, screen } from '@testing-library/react';

import { FormSelectSkeleton } from './form-select-skeleton';

describe('FormSelectSkeleton', () => {
  it('muestra la etiqueta del campo y se anuncia como carga', () => {
    render(<FormSelectSkeleton label="Rol" />);

    const status = screen.getByRole('status', { name: 'Cargando Rol' });
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Rol')).toBeInTheDocument();
  });

  it('dibuja una barra por omisión, con animación de pulso', () => {
    const { container } = render(<FormSelectSkeleton label="Rol" />);

    const rows = container.querySelectorAll(
      '[data-slot="form-select-skeleton-row"]',
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveClass('animate-pulse');
  });

  it('dibuja tantas barras como `rows`', () => {
    const { container } = render(<FormSelectSkeleton label="Rol" rows={3} />);

    expect(
      container.querySelectorAll('[data-slot="form-select-skeleton-row"]'),
    ).toHaveLength(3);
  });

  /** Es genérico: sin etiqueta conocida, una barra ocupa su lugar y el anuncio sigue siendo claro. */
  it('sin etiqueta, dibuja una barra en su lugar', () => {
    render(<FormSelectSkeleton />);

    expect(
      screen.getByRole('status', { name: 'Cargando opciones' }),
    ).toBeInTheDocument();
  });
});
