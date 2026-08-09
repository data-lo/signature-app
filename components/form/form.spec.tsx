import { renderWithProviders, screen } from '@/test-utils';
import { Form } from './form';

describe('Form', () => {
  it('desactiva la validación nativa del navegador (los formularios validan con Zod)', () => {
    const { container } = renderWithProviders(
      <Form aria-label="formulario">
        <input id="email" type="email" defaultValue="correo-invalido" />
      </Form>,
    );

    const form = container.querySelector('form')!;
    expect(form.noValidate).toBe(true);
    // El input sigue siendo inválido para el navegador; lo que cambia es que ya no corta el
    // envío ni muestra su globo antes de que el formulario pueda mostrar su propio mensaje.
    expect(form.querySelector('input')!.checkValidity()).toBe(false);
  });

  it('reenvía las props nativas y permite recuperar la validación del navegador si hiciera falta', () => {
    const onSubmit = jest.fn((event) => event.preventDefault());
    const { container } = renderWithProviders(
      <Form className="mi-clase" noValidate={false} onSubmit={onSubmit}>
        <button type="submit">Enviar</button>
      </Form>,
    );

    const form = container.querySelector('form')!;
    expect(form).toHaveClass('mi-clase');
    expect(form.noValidate).toBe(false);

    screen.getByRole('button', { name: 'Enviar' }).click();
    expect(onSubmit).toHaveBeenCalled();
  });
});
