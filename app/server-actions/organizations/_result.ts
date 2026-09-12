import { BackendRequestError } from '@/lib/server/backend-request';

/**
 * Resultado de una mutación hecha con un Server Action.
 *
 * Las mutaciones devuelven esto en vez de lanzar, y no es una preferencia de estilo: en
 * producción Next reemplaza el mensaje de cualquier error lanzado en el servidor por uno genérico
 * más un `digest`. Lanzando se perdería justo lo que hace útil esta pantalla —"no existe un
 * usuario con ese correo", "ya es miembro", "tiene una membresía dada de baja"—, que es lo que le
 * dice al administrador si le toca invitar, reactivar o no hacer nada.
 *
 * Lanzar sigue siendo lo correcto para las consultas de la carga inicial: ahí no hay nada que
 * explicar y el destino es el error boundary.
 */
export type ActionResult = { ok: true } | { ok: false; message: string };

/**
 * Convierte el fallo de una llamada al backend en un resultado presentable.
 *
 * Sólo reenvía el mensaje del backend cuando la respuesta fue 4xx: son los rechazos que el propio
 * backend redacta para que los lea una persona. Un 5xx o un fallo de red se sustituyen por el
 * texto de respaldo, porque ahí el mensaje puede traer rutas internas, nombres de tablas o el
 * error crudo de un proveedor.
 *
 * @param error - Lo que lanzó `backendRequest`.
 * @param fallback - Qué decir cuando el mensaje del backend no es mostrable.
 * @returns El resultado fallido, listo para devolver al componente cliente.
 * @throws Nada: su razón de ser es no dejar escapar la excepción.
 *
 * @example
 * ```ts
 * try {
 *   await backendRequest('organizations/members', { method: 'POST', body, accountId });
 *   return { ok: true };
 * } catch (error) {
 *   return toFailedResult(error, 'No se pudo agregar al miembro.');
 * }
 * ```
 */
export function toFailedResult(
  error: unknown,
  fallback: string,
): ActionResult {
  // El detalle completo va al log del servidor, nunca al navegador.
  console.error('[organization-members] falló la mutación:', error);

  if (
    error instanceof BackendRequestError &&
    error.status !== null &&
    error.status >= 400 &&
    error.status < 500
  ) {
    return { ok: false, message: error.message };
  }

  return { ok: false, message: fallback };
}
