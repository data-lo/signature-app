import { useForm } from 'react-hook-form';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test-utils';
import SignaturePlacementField from './SignaturePlacementField';
import type { CreateDocumentSignaturesFormValues } from '../_schemas';

// Evita depender de react-pdf/canvas (no disponibles en jsdom) — ver
// resolveSignatureDrop.spec.ts para la lógica de arrastre, que no necesita simular gestos.
// Este stub sigue renderizando las cajas reales calculadas por SignaturePlacementField (label,
// botón de eliminar) para poder probar el flujo de borrado end-to-end sin necesitar el PDF real.
jest.mock('./SignaturePlacementPdfPreview', () => ({
  __esModule: true,
  default: ({
    boxesByPage,
    onDeleteBox,
  }: {
    boxesByPage: Map<
      number,
      { id: string; collaboratorIndex: number; label: string }[]
    >;
    onDeleteBox: (collaboratorIndex: number, signatureId: string) => void;
  }) => (
    <div>
      {Array.from(boxesByPage.values())
        .flat()
        .map((box) => (
          <div key={box.id}>
            <span>{box.label}</span>
            <button onClick={() => onDeleteBox(box.collaboratorIndex, box.id)}>
              Eliminar {box.label}
            </button>
          </div>
        ))}
    </div>
  ),
}));

const FILE = new File(['contenido'], 'contrato.pdf', {
  type: 'application/pdf',
});

function Harness({
  onReady,
}: {
  onReady: (helpers: {
    getValues: ReturnType<
      typeof useForm<CreateDocumentSignaturesFormValues>
    >['getValues'];
  }) => void;
}) {
  const { control, getValues, setValue } =
    useForm<CreateDocumentSignaturesFormValues>({
      defaultValues: {
        signatureType: 'SIMPLE',
        requiresApproval: false,
        includeMeAsSigner: false,
        requiresOrder: false,
        collaborators: [
          {
            collaboratorType: 'SIGNER',
            firstName: 'Ana',
            lastName: 'Gómez',
            email: 'ana@correo.com',
            requiresTwoFactorAuth: true,
            signatures: [
              { id: 'sig-1', page: 1, xRatio: 0.1, yRatio: 0.1, widthRatio: 0.2, heightRatio: 0.08 },
              { id: 'sig-2', page: 2, xRatio: 0.5, yRatio: 0.5, widthRatio: 0.2, heightRatio: 0.08 },
            ],
          },
        ],
      },
    });

  onReady({ getValues });

  return (
    <SignaturePlacementField
      file={FILE}
      control={control}
      getValues={getValues}
      setValue={setValue}
    />
  );
}

describe('SignaturePlacementField', () => {
  it('muestra una caja por cada posición ya colocada, con el nombre del firmante en mayúsculas', () => {
    renderWithProviders(<Harness onReady={() => {}} />);

    expect(screen.getAllByText('ANA GÓMEZ')).toHaveLength(2);
  });

  it('Escenario 6: al eliminar una caja específica, solo se remueve esa entrada — las demás firmas del firmante se conservan', async () => {
    const user = userEvent.setup();
    let getValues!: ReturnType<
      typeof useForm<CreateDocumentSignaturesFormValues>
    >['getValues'];
    renderWithProviders(<Harness onReady={(helpers) => (getValues = helpers.getValues)} />);

    const deleteButtons = screen.getAllByRole('button', { name: /eliminar/i });
    expect(deleteButtons).toHaveLength(2);
    await user.click(deleteButtons[0]);

    const signatures = getValues('collaborators.0.signatures');
    expect(signatures).toHaveLength(1);
    expect(signatures[0].id).toBe('sig-2');
  });

  it('sin firmantes, la barra de chips muestra un mensaje explicativo en vez de quedar vacía', () => {
    function EmptyHarness() {
      const { control, getValues, setValue } =
        useForm<CreateDocumentSignaturesFormValues>({
          defaultValues: {
            requiresApproval: false,
            includeMeAsSigner: false,
            requiresOrder: false,
            collaborators: [],
          },
        });
      return (
        <SignaturePlacementField
          file={FILE}
          control={control}
          getValues={getValues}
          setValue={setValue}
        />
      );
    }

    renderWithProviders(<EmptyHarness />);

    expect(
      screen.getByText(/agrega firmantes para poder ubicar su firma/i),
    ).toBeInTheDocument();
  });
});
