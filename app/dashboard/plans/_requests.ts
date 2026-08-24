import apiClient from '@/lib/axios';
import type { PaymentService } from './_interfaces/payment-service.interface';
import type { CheckoutSession } from './_interfaces/checkout-session.interface';

export async function getPaymentServicesRequest(): Promise<PaymentService[]> {
  const { data } = await apiClient.get<{
    success: boolean;
    message: string;
    data: PaymentService[];
  }>('/api/v1/payments/services');

  return data.data;
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
  const { data } = await apiClient.post<{
    success: boolean;
    message: string;
    data: CheckoutSession;
  }>('/api/v1/payments/checkout-sessions', { priceId });

  return data.data;
}
