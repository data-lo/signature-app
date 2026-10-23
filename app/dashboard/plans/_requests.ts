import apiClient from '@/lib/axios';
import type { PaymentService } from './_interfaces/payment-service.interface';
import type { CheckoutSession } from './_interfaces/checkout-session.interface';
import { toPaymentsError } from './_errors';

/**
 * Los dos llamados traducen el error de axios a un `PaymentsError` antes de dejarlo subir.
 *
 * Se hace aquí, en el borde, y no en la pantalla de error: es el único punto que todavía tiene el
 * error de axios completo —con su código de respuesta— y es lo que permite que el error boundary
 * distinga "el proveedor está caído" de "este backend no tiene el módulo de pagos" o "la llave de
 * Stripe está mal configurada", en vez de mostrar el mismo mensaje para todo.
 */
export async function getPaymentServicesRequest(): Promise<PaymentService[]> {
  try {
    const { data } = await apiClient.get<{
      success: boolean;
      message: string;
      data: PaymentService[];
    }>('/api/v1/payments/services');

    return data.data;
  } catch (error) {
    throw toPaymentsError(error);
  }
}

/**
 * Abre una sesión de Checkout para un servicio.
 *
 * Se llama al pulsar "Comprar" y nunca al listar: cada sesión caduca, así que pedirlas por
 * adelantado dejaría al usuario con URLs muertas y gastaría una llamada al proveedor por cada
 * tarjeta que ni siquiera va a comprar.
 */
export async function createCheckoutSessionRequest(
  priceId: string,
): Promise<CheckoutSession> {
  try {
    const { data } = await apiClient.post<{
      success: boolean;
      message: string;
      data: CheckoutSession;
    }>('/api/v1/payments/checkout-sessions', { priceId });

    return data.data;
  } catch (error) {
    throw toPaymentsError(error);
  }
}
