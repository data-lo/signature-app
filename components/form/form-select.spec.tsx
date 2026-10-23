import { useForm } from 'react-hook-form';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test-utils';
import { FormSelect } from './form-select';

interface FormValues {
  signatureType: string;
  roleId: string;
}

const SIGNATURE_TYPE_OPTIONS = [
  { value: 'SIMPLE', label: 'Firma simple' },
  { value: 'ADVANCED', label: 'Firma electrónica avanzada (e.firma)' },
];

/** Caso realista de un selector cuyo valor es un id: lo que NO debe verse en pantalla. */
const ROLE_OPTIONS = [
  { value: '7c9e6679-7425-40de-944b-e07fc1f90ae7', label: 'ADMIN' },
  { value: 'b1f4a9d2-3c5e-4a7b-8d9f-0e1a2b3c4d5e', label: 'MEMBER' },
];

function Harness({ onSubmit }: { onSubmit?: (values: FormValues) => void }) {
  const { control, handleSubmit } = useForm<FormValues>({
    defaultValues: { signatureType: '', roleId: '' },
  });

  return (
    <form onSubmit={handleSubmit((values) => onSubmit?.(values))}>
      <FormSelect
        control={control}
        name="signatureType"
        label="Tipo de firma"
        options={SIGNATURE_TYPE_OPTIONS}
        placeholder="Selecciona el tipo de firma"
      />
      <FormSelect
        control={control}
        name="roleId"
        label="Rol"
        options={ROLE_OPTIONS}
        placeholder="Selecciona un rol"
      />
      <button type="submit">Guardar</button>
    </form>
  );
}

/**
 * jsdom no dispara los PointerEvent que @base-ui/react usa para abrir el Select con click; el
 * teclado (Enter abre, click en la opción cierra y selecciona) sí recorre los mismos handlers.
 */
async function selectOption(
  user: ReturnType<typeof userEvent.setup>,
  comboboxName: RegExp,
  optionName: string,
) {
  screen.getByRole('combobox', { name: comboboxName }).focus();
  await user.keyboard('{Enter}');
  await user.click(await screen.findByRole('option', { name: optionName }));
}

/**
 * Historia "Mostrar la etiqueta correcta del tipo de firma seleccionado": el trigger mostraba el
 * valor interno de la opción en vez de su texto legible ("SIMPLE" en lugar de "Firma simple", y el
 * UUID del registro en los selectores cuyo valor es un id). La causa era una sola: sin la prop
 * `items`, `<Select.Value>` de @base-ui/react renderiza el valor crudo.
 */
describe('FormSelect', () => {
  it('sin selección, muestra el placeholder', () => {
    renderWithProviders(<Harness />);

    expect(
      screen.getByRole('combobox', { name: /tipo de firma/i }),
    ).toHaveTextContent('Selecciona el tipo de firma');
  });

  it('al seleccionar, muestra la etiqueta legible y no el valor interno', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />);

    await selectOption(user, /tipo de firma/i, 'Firma simple');

    const trigger = screen.getByRole('combobox', { name: /tipo de firma/i });
    expect(trigger).toHaveTextContent('Firma simple');
    expect(trigger).not.toHaveTextContent('SIMPLE');
  });

  it('con valores que son ids, tampoco los filtra a la pantalla', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />);

    await selectOption(user, /rol/i, 'ADMIN');

    const trigger = screen.getByRole('combobox', { name: /rol/i });
    expect(trigger).toHaveTextContent('ADMIN');
    expect(trigger).not.toHaveTextContent(ROLE_OPTIONS[0].value);
  });

  // La etiqueta es solo presentación: lo que viaja en el formulario tiene que seguir siendo el
  // valor interno, o el backend recibiría "Firma simple" como tipo de firma.
  it('conserva el valor interno en el formulario, no la etiqueta', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    renderWithProviders(<Harness onSubmit={onSubmit} />);

    await selectOption(user, /tipo de firma/i, 'Firma electrónica avanzada (e.firma)');
    await selectOption(user, /rol/i, 'MEMBER');
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        signatureType: 'ADVANCED',
        roleId: ROLE_OPTIONS[1].value,
      }),
    );
  });
});
