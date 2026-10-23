import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test-utils';
import { useAuthStore } from '@/lib/store/useAuthStore';
import {
  getDocumentCreditOffersRequest,
  createDocumentCreditCheckoutRequest,
} from '../_requests';
import type { DocumentCreditOffer } from '../_interfaces/document-credit-offer.interface';
import AddDocumentsDialog, { NO_OFFERS_MESSAGE } from './AddDocumentsDialog';

jest.mock('../_requests');

const mockedOffers = getDocumentCreditOffersRequest as jest.Mock;
const mockedCheckout = createDocumentCreditCheckoutRequest as jest.Mock;

const CHECKOUT_URL = 'https://checkout.stripe.com/c/pay/cs_test_123';

/** El ejemplo de la historia: Free → 1 documento por $39 MXN. */
const SINGLE_DOCUMENT_OFFER: DocumentCreditOffer = {
  catalogPriceId: 'precio-free-1',
  name: 'Documento adicional',
  documentsGranted: 1,
  amount: 3900,
  currency: 'mxn',
  stripePriceId: 'price_extra_doc',
};

const TEN_DOCUMENTS_OFFER: DocumentCreditOffer = {
  catalogPriceId: 'precio-premium-10',
  name: 'Paquete de 10 documentos',
  documentsGranted: 10,
  amount: 29900,
  currency: 'mxn',
  stripePriceId: 'price_pack_10',
};

const triggerButton = () =>
  screen.getByRole('button', { name: /agregar más documentos/i });

const payButton = () =>
  screen.getByRole('button', { name: /continuar al pago/i });

const quantityInput = () =>
  screen.getByRole('spinbutton', { name: /cantidad/i });

const summary = () => within(screen.getByLabelText('Resumen de la compra'));

/**
 * Abre el diálogo esperando antes a que el botón deje de estar deshabilitado: mientras se consulta
 * el catálogo hay un botón con el MISMO rótulo pero inerte, y `findByRole` lo encuentra primero.
 *
 * @returns Nada; deja el diálogo abierto con el formulario montado.
 *
 * @example
 * await openDialog();
 */
async function openDialog(): Promise<void> {
  await waitFor(() => expect(triggerButton()).not.toBeDisabled());
  await userEvent.click(triggerButton());
  await screen.findByRole('button', { name: /continuar al pago/i });
}

/**
 * Escribe un valor crudo en el selector de cantidad, como lo entregaría el navegador.
 *
 * Se usa `fireEvent.change` y no `userEvent.type` porque jsdom sanea el valor de un
 * `input type="number"` en cada tecla y no deja escribir estados intermedios como `2.` o `-`.
 *
 * @param value - Texto del input: vacío, decimal, negativo, etc.
 * @returns Nada.
 *
 * @example
 * setQuantity('2.5');
 */
function setQuantity(value: string): void {
  fireEvent.change(quantityInput(), { target: { value } });
}

describe('AddDocumentsDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      activeAccount: {
        id: 'cuenta-1',
        accountType: 'PERSONAL',
        organizationId: null,
        roleId: null,
      },
    });
    mockedOffers.mockResolvedValue([SINGLE_DOCUMENT_OFFER]);
    mockedCheckout.mockResolvedValue({ checkoutUrl: CHECKOUT_URL });
  });

  describe('con un solo paquete disponible', () => {
    /**
     * El precio y la cantidad vienen del catálogo local: los importes se afirman contra los del
     * fixture, no contra literales de la interfaz.
     */
    it('muestra el paquete con sus documentos y su precio del catálogo', async () => {
      renderWithProviders(<AddDocumentsDialog />);
      await openDialog();

      const offer = screen.getByRole('button', { name: /documento adicional/i });
      expect(within(offer).getByText('1 documento')).toBeInTheDocument();
      expect(within(offer).getByText('$39.00')).toBeInTheDocument();
    });

    it('arranca con una unidad y muestra precio unitario, cantidad y total', async () => {
      renderWithProviders(<AddDocumentsDialog />);
      await openDialog();

      expect(quantityInput()).toHaveValue(1);
      expect(summary().getByText('Precio unitario')).toBeInTheDocument();
      expect(summary().getAllByText('$39.00')).toHaveLength(2);
      expect(summary().getByText('1')).toBeInTheDocument();
    });

    /** Con una sola oferta no hay nada que elegir: comprar debe ser un clic. */
    it('permite continuar al pago sin tener que elegir nada', async () => {
      renderWithProviders(<AddDocumentsDialog />);
      await openDialog();

      await userEvent.click(payButton());

      await waitFor(() => expect(mockedCheckout).toHaveBeenCalledTimes(1));
      // react-query pasa un segundo argumento de contexto al mutationFn; sólo importa el primero.
      expect(mockedCheckout.mock.calls[0][0]).toStrictEqual({
        catalogPriceId: 'precio-free-1',
        quantity: 1,
      });
    });
  });

  describe('selección de cantidad', () => {
    it('recalcula documentos y total al escribir otra cantidad', async () => {
      renderWithProviders(<AddDocumentsDialog />);
      await openDialog();

      await userEvent.clear(quantityInput());
      await userEvent.type(quantityInput(), '5');

      expect(summary().getByText('5')).toBeInTheDocument();
      expect(summary().getByText('5 documentos')).toBeInTheDocument();
      expect(summary().getByText('$195.00')).toBeInTheDocument();
    });

    /** Criterio explícito: el submit manda SÓLO los dos campos, con la cantidad ya numérica. */
    it('envía la cantidad transformada a número y sólo catalogPriceId y quantity', async () => {
      renderWithProviders(<AddDocumentsDialog />);
      await openDialog();

      setQuantity('5');
      await userEvent.click(payButton());

      await waitFor(() => expect(mockedCheckout).toHaveBeenCalledTimes(1));
      const [payload] = mockedCheckout.mock.calls[0];
      expect(payload).toStrictEqual({
        catalogPriceId: 'precio-free-1',
        quantity: 5,
      });
      expect(typeof payload.quantity).toBe('number');
    });

    it('permite comprar el máximo permitido', async () => {
      renderWithProviders(<AddDocumentsDialog />);
      await openDialog();

      setQuantity('100');

      expect(summary().getByText('$3,900.00')).toBeInTheDocument();
      await userEvent.click(payButton());
      await waitFor(() =>
        expect(mockedCheckout.mock.calls[0][0]).toStrictEqual({
          catalogPriceId: 'precio-free-1',
          quantity: 100,
        }),
      );
    });

    it.each([
      ['vacía', '', 'Debes seleccionar al menos un documento.'],
      ['cero', '0', 'Debes seleccionar al menos un documento.'],
      ['negativa', '-1', 'Debes seleccionar al menos un documento.'],
      ['decimal', '2.5', 'La cantidad debe ser un número entero.'],
      ['mayor al máximo', '101', 'Puedes comprar máximo 100 documentos.'],
    ])(
      'con una cantidad %s muestra el error, deshabilita el pago y no crea Checkout',
      async (_caso, value, message) => {
        renderWithProviders(<AddDocumentsDialog />);
        await openDialog();

        setQuantity(value);

        expect(await screen.findByText(message)).toBeInTheDocument();
        expect(quantityInput()).toHaveAttribute('aria-invalid', 'true');
        expect(payButton()).toBeDisabled();
        // Ni forzando el envío del formulario (Enter en el campo) se crea el Checkout.
        fireEvent.submit(quantityInput().closest('form')!);
        await waitFor(() => expect(mockedCheckout).not.toHaveBeenCalled());
      },
    );

    it('vuelve a habilitar el pago al corregir la cantidad', async () => {
      renderWithProviders(<AddDocumentsDialog />);
      await openDialog();

      setQuantity('0');
      await waitFor(() => expect(payButton()).toBeDisabled());

      setQuantity('3');

      await waitFor(() => expect(payButton()).not.toBeDisabled());
      expect(
        screen.queryByText('Debes seleccionar al menos un documento.'),
      ).not.toBeInTheDocument();
    });
  });

  describe('cuando el backend rechaza la compra', () => {
    /**
     * El backend es quien decide: si su máximo es otro, su mensaje se asocia con el campo de
     * cantidad mediante `setError` y el pago se queda bloqueado hasta corregirla. La redirección
     * no se afirma (jsdom no deja interceptar `window.location.assign`), pero el diálogo sigue
     * abierto y sin el estado de "Redirigiendo".
     */
    it('muestra debajo de la cantidad el rechazo de cantidad y no redirige', async () => {
      mockedCheckout.mockRejectedValue({
        response: {
          status: 400,
          data: {
            statusCode: 400,
            message: 'Puedes comprar máximo 50 documentos.',
            field: 'quantity',
            maxQuantity: 50,
          },
        },
      });

      renderWithProviders(<AddDocumentsDialog />);
      await openDialog();

      setQuantity('60');
      await userEvent.click(payButton());

      expect(
        await screen.findByText('Puedes comprar máximo 50 documentos.'),
      ).toBeInTheDocument();
      expect(quantityInput()).toHaveAttribute('aria-invalid', 'true');
      expect(payButton()).toBeDisabled();
      expect(screen.queryByText(/redirigiendo a stripe/i)).not.toBeInTheDocument();

      setQuantity('40');

      await waitFor(() =>
        expect(
          screen.queryByText('Puedes comprar máximo 50 documentos.'),
        ).not.toBeInTheDocument(),
      );
      expect(payButton()).not.toBeDisabled();
    });

    it('muestra en el formulario el rechazo de la oferta', async () => {
      mockedCheckout.mockRejectedValue({
        response: {
          status: 404,
          data: {
            message: 'El paquete de documentos seleccionado no está disponible.',
          },
        },
      });

      renderWithProviders(<AddDocumentsDialog />);
      await openDialog();
      await userEvent.click(payButton());

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'El paquete de documentos seleccionado no está disponible.',
      );
      expect(quantityInput()).not.toHaveAttribute('aria-invalid');
    });

    /**
     * El fallo se dibuja DENTRO del diálogo y no levanta el error boundary: no se ha cobrado
     * nada, el usuario sigue en su sitio y puede reintentar sin perder el contexto.
     */
    it('muestra un error genérico si el proveedor falla y deja reintentar', async () => {
      mockedCheckout
        .mockRejectedValueOnce(new Error('Stripe caído'))
        .mockResolvedValueOnce({ checkoutUrl: CHECKOUT_URL });

      renderWithProviders(<AddDocumentsDialog />);
      await openDialog();
      await userEvent.click(payButton());

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'No pudimos abrir el pago. Intenta de nuevo en unos minutos.',
      );
      expect(screen.getByText('Documento adicional')).toBeInTheDocument();

      await userEvent.click(payButton());
      await waitFor(() => expect(mockedCheckout).toHaveBeenCalledTimes(2));
    });
  });

  describe('con varios paquetes', () => {
    beforeEach(() => {
      mockedOffers.mockResolvedValue([SINGLE_DOCUMENT_OFFER, TEN_DOCUMENTS_OFFER]);
    });

    it('los muestra todos para que el usuario elija', async () => {
      renderWithProviders(<AddDocumentsDialog />);
      await openDialog();

      const pack = screen.getByRole('button', {
        name: /paquete de 10 documentos/i,
      });
      expect(within(pack).getByText('10 documentos')).toBeInTheDocument();
      expect(within(pack).getByText('$299.00')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /documento adicional/i }),
      ).toBeInTheDocument();
    });

    /** Sin elección no se puede comprar: no hay un "primero" que valga por defecto. */
    it('no deja continuar hasta que se elige uno', async () => {
      renderWithProviders(<AddDocumentsDialog />);
      await openDialog();

      expect(payButton()).toBeDisabled();
      expect(screen.queryByLabelText('Resumen de la compra')).not.toBeInTheDocument();
    });

    it('abre el Checkout del paquete elegido con la cantidad elegida', async () => {
      renderWithProviders(<AddDocumentsDialog />);
      await openDialog();

      await userEvent.click(
        screen.getByRole('button', { name: /paquete de 10 documentos/i }),
      );
      setQuantity('3');

      expect(summary().getByText('30 documentos')).toBeInTheDocument();
      expect(summary().getByText('$897.00')).toBeInTheDocument();

      await userEvent.click(payButton());

      await waitFor(() => expect(mockedCheckout).toHaveBeenCalledTimes(1));
      expect(mockedCheckout.mock.calls[0][0]).toStrictEqual({
        catalogPriceId: 'precio-premium-10',
        quantity: 3,
      });
    });
  });

  describe('sin paquetes para el plan', () => {
    beforeEach(() => {
      mockedOffers.mockResolvedValue([]);
    });

    /** El criterio explícito: si no hay paquetes, el botón no permite iniciar compra. */
    it('deja el botón deshabilitado', async () => {
      renderWithProviders(<AddDocumentsDialog />);

      await waitFor(() =>
        expect(triggerButton()).toHaveAttribute('aria-disabled', 'true'),
      );
    });

    it('no abre ningún Checkout al pulsarlo', async () => {
      renderWithProviders(<AddDocumentsDialog />);

      await waitFor(() =>
        expect(triggerButton()).toHaveAttribute('aria-disabled', 'true'),
      );
      await userEvent.click(triggerButton());

      expect(mockedCheckout).not.toHaveBeenCalled();
      expect(
        screen.queryByRole('button', { name: /continuar al pago/i }),
      ).not.toBeInTheDocument();
    });

    it('explica por qué al interactuar con el botón', async () => {
      renderWithProviders(<AddDocumentsDialog />);

      /**
       * Se vuelve a consultar el botón después de esperar: el de carga es OTRO elemento con el
       * mismo rótulo, y quedarse con la referencia de aquél deja mirando un nodo ya reemplazado.
       */
      await waitFor(() =>
        expect(triggerButton()).toHaveAttribute('aria-disabled', 'true'),
      );
      await userEvent.hover(triggerButton());

      expect(await screen.findByText(NO_OFFERS_MESSAGE)).toBeInTheDocument();
    });
  });

  /** Sin catálogo no hay compra que iniciar, y el motivo se dice en vez de dejar un botón muerto. */
  it('deshabilita el botón si el catálogo no se pudo cargar', async () => {
    mockedOffers.mockRejectedValue(new Error('catálogo caído'));

    renderWithProviders(<AddDocumentsDialog />);

    await waitFor(() =>
      expect(triggerButton()).toHaveAttribute('aria-disabled', 'true'),
    );
  });
});
