import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test-utils';
import { useAuthStore } from '@/lib/store/useAuthStore';
import {
  getDocumentCreditOffersRequest,
  createDocumentCreditCheckoutRequest,
} from '../_requests';
import type { DocumentCreditOffer } from '../_interfaces/document-credit-offer.interface';
import AddDocumentsDialog, { SIN_PAQUETES } from './AddDocumentsDialog';

jest.mock('../_requests');

const mockedOffers = getDocumentCreditOffersRequest as jest.Mock;
const mockedCheckout = createDocumentCreditCheckoutRequest as jest.Mock;

const CHECKOUT_URL = 'https://checkout.stripe.com/c/pay/cs_test_123';

/** El ejemplo de la historia: Free → 1 documento por $39 MXN. */
const PAQUETE_FREE: DocumentCreditOffer = {
  catalogPriceId: 'precio-free-1',
  name: 'Documento adicional',
  documentsGranted: 1,
  amount: 3900,
  currency: 'mxn',
  stripePriceId: 'price_extra_doc',
};

const PAQUETE_10: DocumentCreditOffer = {
  catalogPriceId: 'precio-premium-10',
  name: 'Paquete de 10 documentos',
  documentsGranted: 10,
  amount: 29900,
  currency: 'mxn',
  stripePriceId: 'price_pack_10',
};

const botonPrincipal = () =>
  screen.getByRole('button', { name: /agregar más documentos/i });

/**
 * Se espera a que el botón deje de estar deshabilitado antes de pulsarlo: mientras se consulta el
 * catálogo hay un botón con el MISMO rótulo pero inerte, y `findByRole` lo encuentra primero.
 */
const abrirDialogo = async () => {
  await waitFor(() => expect(botonPrincipal()).not.toBeDisabled());
  await userEvent.click(botonPrincipal());
};

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
    mockedOffers.mockResolvedValue([PAQUETE_FREE]);
    mockedCheckout.mockResolvedValue({ checkoutUrl: CHECKOUT_URL });
  });

  describe('con un solo paquete disponible', () => {
    /**
     * El precio y la cantidad vienen del catálogo local: si alguien los escribiera en el código,
     * esta prueba seguiría pasando con otros valores y ésa es justamente la regresión que cubre —
     * los importes se afirman contra los del fixture, no contra literales de la interfaz.
     */
    it('muestra el paquete con sus documentos y su precio del catálogo', async () => {
      renderWithProviders(<AddDocumentsDialog />);
      await abrirDialogo();

      expect(await screen.findByText('Documento adicional')).toBeInTheDocument();
      expect(screen.getByText('1 documento')).toBeInTheDocument();
      expect(screen.getByText('$39.00')).toBeInTheDocument();
    });

    /** Con una sola oferta no hay nada que elegir: comprar debe ser un clic. */
    it('permite continuar al pago sin tener que elegir nada', async () => {
      renderWithProviders(<AddDocumentsDialog />);
      await abrirDialogo();

      await userEvent.click(
        await screen.findByRole('button', { name: /continuar al pago/i }),
      );

      await waitFor(() => expect(mockedCheckout).toHaveBeenCalledTimes(1));
      // react-query pasa un segundo argumento de contexto al mutationFn; sólo importa el id.
      // Viaja el id del catálogo LOCAL, no el `price_...` de Stripe.
      expect(mockedCheckout.mock.calls[0][0]).toBe('precio-free-1');
    });
  });

  describe('con varios paquetes', () => {
    beforeEach(() => {
      mockedOffers.mockResolvedValue([PAQUETE_FREE, PAQUETE_10]);
    });

    it('los muestra todos para que el usuario elija', async () => {
      renderWithProviders(<AddDocumentsDialog />);
      await abrirDialogo();

      expect(await screen.findByText('Documento adicional')).toBeInTheDocument();
      expect(screen.getByText('Paquete de 10 documentos')).toBeInTheDocument();
      expect(screen.getByText('10 documentos')).toBeInTheDocument();
      expect(screen.getByText('$299.00')).toBeInTheDocument();
    });

    /** Sin elección no se puede comprar: no hay un "primero" que valga por defecto. */
    it('no deja continuar hasta que se elige uno', async () => {
      renderWithProviders(<AddDocumentsDialog />);
      await abrirDialogo();

      expect(
        await screen.findByRole('button', { name: /continuar al pago/i }),
      ).toBeDisabled();
    });

    it('abre el Checkout del paquete elegido', async () => {
      renderWithProviders(<AddDocumentsDialog />);
      await abrirDialogo();

      await userEvent.click(
        await screen.findByText('Paquete de 10 documentos'),
      );
      await userEvent.click(
        screen.getByRole('button', { name: /continuar al pago/i }),
      );

      await waitFor(() => expect(mockedCheckout).toHaveBeenCalledTimes(1));
      expect(mockedCheckout.mock.calls[0][0]).toBe('precio-premium-10');
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
        expect(
          screen.getByRole('button', { name: /agregar más documentos/i }),
        ).toHaveAttribute('aria-disabled', 'true'),
      );
    });

    it('no abre ningún Checkout al pulsarlo', async () => {
      renderWithProviders(<AddDocumentsDialog />);

      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: /agregar más documentos/i }),
        ).toHaveAttribute('aria-disabled', 'true'),
      );
      await userEvent.click(
        screen.getByRole('button', { name: /agregar más documentos/i }),
      );

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
        expect(botonPrincipal()).toHaveAttribute('aria-disabled', 'true'),
      );
      await userEvent.hover(botonPrincipal());

      expect(await screen.findByText(SIN_PAQUETES)).toBeInTheDocument();
    });
  });

  describe('cuando algo falla', () => {
    /** Sin catálogo no hay compra que iniciar, y el motivo se dice en vez de dejar un botón muerto. */
    it('deshabilita el botón si el catálogo no se pudo cargar', async () => {
      mockedOffers.mockRejectedValue(new Error('catálogo caído'));

      renderWithProviders(<AddDocumentsDialog />);

      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: /agregar más documentos/i }),
        ).toHaveAttribute('aria-disabled', 'true'),
      );
    });

    /**
     * El fallo se dibuja DENTRO del diálogo y no levanta el error boundary: no se ha cobrado
     * nada, el usuario sigue en su sitio y puede reintentar sin perder el contexto.
     */
    it('muestra el error de la compra sin cerrar el diálogo', async () => {
      mockedCheckout.mockRejectedValue(new Error('Stripe caído'));

      renderWithProviders(<AddDocumentsDialog />);
      await abrirDialogo();
      await userEvent.click(
        await screen.findByRole('button', { name: /continuar al pago/i }),
      );

      expect(await screen.findByRole('alert')).toBeInTheDocument();
      // El diálogo sigue abierto: el paquete se ve todavía.
      expect(screen.getByText('Documento adicional')).toBeInTheDocument();
    });
  });
});
