import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import ShareDocumentLinkAction from './ShareDocumentLinkAction';

const PUBLIC_URL = 'https://app.ejemplo.com/public/documents/doc-1';

function renderAction(
  props: Partial<React.ComponentProps<typeof ShareDocumentLinkAction>> = {},
) {
  const onShare = jest.fn();
  const onDismissFallback = jest.fn();
  render(
    <ShareDocumentLinkAction
      status="idle"
      publicUrl={null}
      onShare={onShare}
      onDismissFallback={onDismissFallback}
      {...props}
    />,
  );
  return { onShare, onDismissFallback };
}

describe('ShareDocumentLinkAction', () => {
  it('ofrece una acción visible para compartir el enlace público', async () => {
    const user = userEvent.setup();
    const { onShare } = renderAction();

    await user.click(screen.getByRole('button', { name: /compartir enlace/i }));

    expect(onShare).toHaveBeenCalled();
  });

  it('mientras copia, deshabilita la acción para no disparar dos copias seguidas', () => {
    renderAction({ status: 'copying' });

    expect(
      screen.getByRole('button', { name: /copiando enlace/i }),
    ).toBeDisabled();
  });

  it('confirma en la propia acción que el enlace quedó copiado', () => {
    renderAction({ status: 'copied' });

    expect(
      screen.getByRole('button', { name: /enlace copiado/i }),
    ).toBeInTheDocument();
  });

  it('en estado de éxito no muestra el respaldo manual: no hace falta', () => {
    renderAction({ status: 'copied' });

    expect(
      screen.queryByLabelText(/enlace público del documento/i),
    ).not.toBeInTheDocument();
  });

  /** Criterio: "Si falla la copia, se muestra una alternativa para copiarlo manualmente". */
  it('si la copia falla, muestra el enlace en un campo de solo lectura para copiarlo a mano', () => {
    renderAction({ status: 'error', publicUrl: PUBLIC_URL });

    const field = screen.getByLabelText(/enlace público del documento/i);
    expect(field).toHaveValue(PUBLIC_URL);
    expect(field).toHaveAttribute('readonly');
    expect(screen.getByRole('alert')).toHaveTextContent(/cópialo manualmente/i);
  });

  it('tras un fallo, la acción invita a reintentar la copia', async () => {
    const user = userEvent.setup();
    const { onShare } = renderAction({
      status: 'error',
      publicUrl: PUBLIC_URL,
    });

    await user.click(screen.getByRole('button', { name: /reintentar copia/i }));

    expect(onShare).toHaveBeenCalled();
  });

  it('permite cerrar el respaldo manual', async () => {
    const user = userEvent.setup();
    const { onDismissFallback } = renderAction({
      status: 'error',
      publicUrl: PUBLIC_URL,
    });

    await user.click(screen.getByRole('button', { name: /cerrar/i }));

    expect(onDismissFallback).toHaveBeenCalled();
  });
});
