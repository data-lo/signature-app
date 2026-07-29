import { DndContext } from '@dnd-kit/core';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test-utils';
import SignatureBox from './SignatureBox';

function renderBox(overrides: Partial<Parameters<typeof SignatureBox>[0]> = {}) {
  const onDelete = jest.fn();
  renderWithProviders(
    <DndContext>
      <SignatureBox
        id="sig-1"
        collaboratorIndex={0}
        xRatio={0.1}
        yRatio={0.2}
        widthRatio={0.2}
        heightRatio={0.08}
        label="ANA GÓMEZ"
        colorClassName="border-blue-300 bg-blue-50"
        isRejected={false}
        onDelete={onDelete}
        {...overrides}
      />
    </DndContext>,
  );
  return { onDelete };
}

describe('SignatureBox', () => {
  it('muestra el nombre del firmante centrado y en mayúsculas (Escenario 1 de la historia)', () => {
    renderBox({ label: 'ANA GÓMEZ' });

    const label = screen.getByText('ANA GÓMEZ');
    expect(label).toBeInTheDocument();
    expect(label.parentElement).toHaveClass('uppercase');
  });

  it('no renderiza ningún control de redimensionamiento (Escenario 5 de la historia)', () => {
    const { container } = renderWithProviders(
      <DndContext>
        <SignatureBox
          id="sig-1"
          collaboratorIndex={0}
          xRatio={0.1}
          yRatio={0.2}
          widthRatio={0.2}
          heightRatio={0.08}
          label="ANA GÓMEZ"
          colorClassName="border-blue-300 bg-blue-50"
          isRejected={false}
          onDelete={jest.fn()}
        />
      </DndContext>,
    );

    // Solo debe existir el botón de eliminar — ninguna otra asa/control.
    expect(container.querySelectorAll('button')).toHaveLength(1);
    expect(
      screen.getByRole('button', { name: /eliminar firma/i }),
    ).toBeInTheDocument();
  });

  it('el click en el botón de eliminar llama a onDelete exactamente una vez, sin iniciar un arrastre', async () => {
    const user = userEvent.setup();
    const { onDelete } = renderBox();

    await user.click(screen.getByRole('button', { name: /eliminar firma/i }));

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('aplica la animación de rechazo cuando isRejected es true', () => {
    renderBox({ isRejected: true, label: 'ANA GÓMEZ' });

    expect(screen.getByText('ANA GÓMEZ').closest('div[class*="absolute"]')).toHaveClass(
      'animate-signature-reject',
    );
  });
});
