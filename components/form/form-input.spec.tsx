import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test-utils';
import { FormInput } from './form-input';

const schema = z.object({
  nickname: z.string().min(3, { message: 'Mínimo 3 caracteres' }),
  alias: z.string().nullable(),
});

type FormValues = z.infer<typeof schema>;

function Harness({ onSubmit }: { onSubmit?: (values: FormValues) => void }) {
  const { control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { nickname: '', alias: null },
  });

  return (
    <form onSubmit={handleSubmit((values) => onSubmit?.(values))}>
      <FormInput
        control={control}
        name="nickname"
        label="Apodo"
        placeholder="Escribe tu apodo"
        required
      />
      <FormInput control={control} name="alias" label="Alias" />
      <button type="submit">Guardar</button>
    </form>
  );
}

describe('FormInput', () => {
  it('asocia la etiqueta con el campo y acepta props nativas del input', () => {
    renderWithProviders(<Harness />);

    const input = screen.getByLabelText(/apodo/i);
    expect(input).toHaveAttribute('placeholder', 'Escribe tu apodo');
    expect(input).toHaveAttribute('aria-required', 'true');
  });

  it('escribe el valor en el formulario', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    renderWithProviders(<Harness onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/apodo/i), 'Juan');
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ nickname: 'Juan' }),
    );
  });

  it('muestra el error del esquema junto al campo y lo marca como inválido', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />);

    await user.type(screen.getByLabelText(/apodo/i), 'ab');

    expect(await screen.findByText('Mínimo 3 caracteres')).toBeInTheDocument();
    expect(screen.getByLabelText(/apodo/i)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('normaliza un valor nulo a cadena vacía (campo opcional del esquema)', () => {
    renderWithProviders(<Harness />);

    expect(screen.getByLabelText(/alias/i)).toHaveValue('');
  });
});
