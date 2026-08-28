const STORAGE_KEY = 'pending_signature_capture_token';

/**
 * Token del QR de captura de firma, guardado mientras el usuario pasa por el inicio de sesión.
 *
 * Mismo patrón y misma razón que `pending-signature-context` (ver historia "Notificación por Email
 * para Firma Simple"): quien escanea el QR suele abrirlo en un celular donde no tiene la sesión
 * iniciada, y el middleware lo manda a `/login`. Sin guardar el token antes de esa redirección, el
 * `?token=…` se pierde y el usuario termina en el dashboard sin forma de volver a la captura — el
 * QR es de un solo uso, así que tendría que generar otro desde la computadora.
 *
 * Va en `localStorage` y no en la URL de `/login` para no arrastrar por la barra de direcciones un
 * valor que autoriza a escribir la firma de una cuenta.
 *
 * **Guardarlo no da acceso a nada por sí solo.** El token únicamente identifica la captura: para
 * canjearlo hace falta sesión iniciada, y el backend comprueba que quien reclama sea el mismo
 * usuario que la generó.
 */
export function setPendingSignatureCaptureToken(token: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, token);
  } catch {
    // localStorage no disponible (modo privado, cuota excedida). El usuario puede iniciar sesión
    // igual; sólo pierde el regreso automático a la captura.
  }
}

export function getPendingSignatureCaptureToken(): string | null {
  try {
    const token = localStorage.getItem(STORAGE_KEY);
    return token && token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

/** Debe llamarse en cuanto el token se canjea o se descarta: es de un solo uso. */
export function clearPendingSignatureCaptureToken(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}
