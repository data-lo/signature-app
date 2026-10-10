import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, within } from '@/test-utils';
import DirectoryContactsDialog from './DirectoryContactsDialog';
import type { DirectoryPreviewContact } from '../_config/directory-preview.config';

const CONTACTS: DirectoryPreviewContact[] = [
  { id: '1', firstName: 'Ana', lastName: 'García López' },
  { id: '2', firstName: 'Carlos', lastName: 'Hernández Ruiz' },
];

function renderDialog(
  props: Partial<Parameters<typeof DirectoryContactsDialog>[0]> = {},
) {
  return renderWithProviders(
    <DirectoryContactsDialog
      open
      onOpenChange={jest.fn()}
      contacts={CONTACTS}
      {...props}
    />,
  );
}

const searchbox = () =>
  screen.getByRole('searchbox', { name: /buscar contacto/i });

/**
 * El modal es sólo interfaz: lo que se prueba son sus estados visuales y que cada resultado
 * muestre nombre, apellido y sus dos acciones. No hay API ni alta de participantes.
 */
describe('DirectoryContactsDialog', () => {
  it('sin búsqueda iniciada muestra el buscador y la invitación a buscar, sin resultados', () => {
    renderDialog();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(searchbox()).toHaveValue('');
    expect(screen.getByText('Busca en tu directorio')).toBeInTheDocument();
    expect(
      screen.queryByRole('list', { name: /resultados del directorio/i }),
    ).not.toBeInTheDocument();
  });

  it('cada resultado muestra nombre y apellido con sus botones Testigo y Firmante', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(searchbox(), 'a');

    const items = within(
      screen.getByRole('list', { name: /resultados del directorio/i }),
    ).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText('Ana García López')).toBeInTheDocument();
    expect(
      within(items[0]).getByRole('button', { name: /como testigo/i }),
    ).toHaveTextContent('Testigo');
    expect(
      within(items[0]).getByRole('button', { name: /como firmante/i }),
    ).toHaveTextContent('Firmante');
  });

  it('filtra los contactos simulados sin distinguir acentos', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(searchbox(), 'hernandez');

    expect(screen.getByText('Carlos Hernández Ruiz')).toBeInTheDocument();
    expect(screen.queryByText('Ana García López')).not.toBeInTheDocument();
  });

  it('sin coincidencias muestra el estado vacío', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(searchbox(), 'zzz');

    expect(screen.getByText('Sin resultados')).toBeInTheDocument();
  });

  it('los botones de un resultado llaman a sus acciones si se pasan', async () => {
    const user = userEvent.setup();
    const onSelectSigner = jest.fn();
    const onSelectWitness = jest.fn();
    renderDialog({ onSelectSigner, onSelectWitness });

    await user.type(searchbox(), 'ana');
    await user.click(screen.getByRole('button', { name: /como firmante/i }));
    await user.click(screen.getByRole('button', { name: /como testigo/i }));

    expect(onSelectSigner).toHaveBeenCalledWith(CONTACTS[0]);
    expect(onSelectWitness).toHaveBeenCalledWith(CONTACTS[0]);
  });
});
