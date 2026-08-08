import { useForm } from 'react-hook-form';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test-utils';
import { FormCheckbox } from './form-checkbox';

interface FormValues {
  acceptsTerms: boolean;
  signatureType: 'SIMPLE' | 'ADVANCED';
}

function Harness({ onChange }: { onChange?: (values: FormValues) => void }) {
  const { control, handleSubmit } = useForm<FormValues>({
    defaultValues: { acceptsTerms: false, signatureType: 'SIMPLE' },
  });

  return (
    <form onSubmit={handleSubmit((values) => onChange?.(values))}>
      <FormCheckbox
        control={control}
        name="acceptsTerms"
        label="Acepto los términos"
        description="Puedes revisarlos en cualquier momento."
      />
      <FormCheckbox
        control={control}
        name="signatureType"
        label="¿Requiere firma avanzada?"
        checkedValue="ADVANCED"
        uncheckedValue="SIMPLE"
      />
      <button type="submit">Guardar</button>
    </form>
  );
}

describe('FormCheckbox', () => {
  it('alterna un valor booleano', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderWithProviders(<Harness onChange={onChange} />);

    await user.click(
      screen.getByRole('checkbox', { name: /acepto los términos/i }),
    );
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ acceptsTerms: true }),
    );
  });

  it('muestra la descripción de apoyo', () => {
    renderWithProviders(<Harness />);

    expect(
      screen.getByText(/puedes revisarlos en cualquier momento/i),
    ).toBeInTheDocument();
  });

  it('con checkedValue/uncheckedValue, gobierna un campo que no es booleano', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderWithProviders(<Harness onChange={onChange} />);

    const advanced = screen.getByRole('checkbox', {
      name: /firma avanzada/i,
    });
    expect(advanced).toHaveAttribute('data-unchecked');

    await user.click(advanced);
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ signatureType: 'ADVANCED' }),
    );

    await user.click(advanced);
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ signatureType: 'SIMPLE' }),
    );
  });
});
