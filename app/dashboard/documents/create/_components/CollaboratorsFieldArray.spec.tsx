import { useForm } from 'react-hook-form';
import { renderWithProviders, screen } from '@/test-utils';
import CollaboratorsFieldArray from './CollaboratorsFieldArray';
import { emptySigner, type CreateDocumentSignaturesFormValues } from '../_schemas';

function signers(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    ...emptySigner(),
    firstName: `Firmante${i}`,
    lastName: 'Apellido',
    email: `firmante${i}@correo.com`,
  }));
}

function Harness({
  signerCount,
  requiresOrder,
}: {
  signerCount: number;
  requiresOrder: boolean;
}) {
  const { control } = useForm<CreateDocumentSignaturesFormValues>({
    defaultValues: {
      requiresApproval: false,
      includeMeAsSigner: false,
      requiresOrder,
      collaborators: signers(signerCount),
    },
  });

  return <CollaboratorsFieldArray control={control} />;
}

describe('CollaboratorsFieldArray', () => {
  it('con requiresOrder activo y más de 2 firmantes: muestra drag handles y el índice de posición (1,2,3...)', () => {
    renderWithProviders(<Harness signerCount={3} requiresOrder />);

    expect(
      screen.getAllByRole('button', { name: /arrastrar para reordenar/i }),
    ).toHaveLength(3);
    expect(screen.getByLabelText('Posición 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Posición 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Posición 3')).toBeInTheDocument();
  });

  it('con requiresOrder activo pero solo 2 firmantes: no muestra drag handles ni índice (lista estándar)', () => {
    renderWithProviders(<Harness signerCount={2} requiresOrder />);

    expect(
      screen.queryByRole('button', { name: /arrastrar para reordenar/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Posición \d+$/)).not.toBeInTheDocument();
  });

  it('con más de 2 firmantes pero requiresOrder inactivo: no muestra drag handles ni índice (lista estándar)', () => {
    renderWithProviders(<Harness signerCount={3} requiresOrder={false} />);

    expect(
      screen.queryByRole('button', { name: /arrastrar para reordenar/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Posición \d+$/)).not.toBeInTheDocument();
  });
});
