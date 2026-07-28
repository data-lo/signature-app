import { useForm } from 'react-hook-form';
import { renderWithProviders, screen } from '@/test-utils';
import RequiresOrderField from './RequiresOrderField';
import type { CreateDocumentSignaturesFormValues } from '../_schemas';

function Harness({
  signerCount,
  defaultValue = false,
}: {
  signerCount: number;
  defaultValue?: boolean;
}) {
  const { control } = useForm<CreateDocumentSignaturesFormValues>({
    defaultValues: {
      requiresApproval: false,
      includeMeAsSigner: false,
      requiresOrder: defaultValue,
      collaborators: [],
    },
  });

  return <RequiresOrderField control={control} signerCount={signerCount} />;
}

describe('RequiresOrderField', () => {
  it('con 2 o menos firmantes: el switch queda deshabilitado y explica el requisito', () => {
    renderWithProviders(<Harness signerCount={2} />);

    expect(
      screen.getByRole('switch', { name: /requiere firmas en orden/i }),
    ).toHaveAttribute('aria-disabled', 'true');
    expect(
      screen.getByText(/agrega más de 2 firmantes para poder definir un orden de firma/i),
    ).toBeInTheDocument();
  });

  it('con más de 2 firmantes: el switch se habilita y muestra la instrucción de arrastre', () => {
    renderWithProviders(<Harness signerCount={3} />);

    expect(
      screen.getByRole('switch', { name: /requiere firmas en orden/i }),
    ).not.toHaveAttribute('aria-disabled');
    expect(
      screen.getByText(/arrastra a los participantes para definir el orden/i),
    ).toBeInTheDocument();
  });

  it('bug evitado: si el conteo de firmantes baja de 3 mientras el toggle estaba activo, se apaga solo en vez de quedar en un estado inconsistente', () => {
    const { rerender } = renderWithProviders(
      <Harness signerCount={3} defaultValue />,
    );

    const toggle = screen.getByRole('switch', {
      name: /requiere firmas en orden/i,
    });
    expect(toggle).toHaveAttribute('data-checked');

    rerender(<Harness signerCount={2} defaultValue />);

    expect(
      screen.getByRole('switch', { name: /requiere firmas en orden/i }),
    ).toHaveAttribute('data-unchecked');
  });
});
