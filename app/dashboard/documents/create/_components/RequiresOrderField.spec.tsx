import { useForm } from 'react-hook-form';
import { renderWithProviders, screen } from '@/test-utils';
import RequiresOrderField from './RequiresOrderField';
import type { CreateDocumentSignaturesFormValues } from '../_schemas';

function Harness({
  defaultValue = false,
}: {
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

  return <RequiresOrderField control={control} />;
}

describe('RequiresOrderField', () => {
  it('está habilitado desde la configuración, sin importar los firmantes agregados', () => {
    renderWithProviders(<Harness />);

    expect(
      screen.getByRole('switch', { name: /requiere firmas en orden/i }),
    ).not.toHaveAttribute('aria-disabled');
    expect(
      screen.getByText(/con dos o más firmantes podrás arrastrarlos para acomodarlos/i),
    ).toBeInTheDocument();
  });

  it('conserva la selección aunque todavía no haya suficientes firmantes para arrastrar', () => {
    renderWithProviders(<Harness defaultValue />);

    const toggle = screen.getByRole('switch', {
      name: /requiere firmas en orden/i,
    });
    expect(toggle).toHaveAttribute('data-checked');
  });
});
