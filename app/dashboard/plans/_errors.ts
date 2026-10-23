import { isAxiosError } from 'axios';

/**
 * Por qué falló el flujo de pagos, en las categorías que **cambian lo que el usuario puede
 * hacer**. No son las categorías de HTTP: son "reintenta", "vuelve a entrar" y "esto no lo
 * arreglas tú".
 *
 * La distinción existe por un fallo real: la sección de pagos dejó de cargar en el entorno
 * desplegado y la pantalla decía lo mismo que diría si Stripe estuviera caído, si la ruta no
 * existiera en ese backend o si la sesión hubiera expirado. El reporte llegó sin causa porque la
 * interfaz no daba ninguna, y el detalle sólo existía en la consola del navegador — donde nadie
 * mira antes de reportar.
 */
export type PaymentsErrorKind =
  | 'unauthorized'
  | 'not-found'
  | 'misconfigured'
  | 'unavailable'
  | 'network'
  | 'unknown';

export class PaymentsError extends Error {
  readonly kind: PaymentsErrorKind;
  /** Código HTTP, cuando lo hubo. Es lo primero que sirve en un reporte de soporte. */
  readonly status: number | null;

  constructor(kind: PaymentsErrorKind, status: number | null, message: string) {
    super(message);
    this.name = 'PaymentsError';
    this.kind = kind;
    this.status = status;
  }
}

/**
 * Clasifica el fallo por su código de respuesta.
 *
 * Cada rama corresponde a algo que de verdad pasó o puede pasar en este flujo:
 *
 * - **404** — el backend de ese entorno no expone `/api/v1/payments`. Ocurre al apuntar el
 *   frontend a una rama donde el módulo de pagos no existe, y es indistinguible de "está caído"
 *   si no se mira el código.
 * - **500** — el backend levanta pero su integración con Stripe está mal configurada (llave de
 *   otra cuenta, revocada, o restringida sin permiso de lectura). Reintentar no sirve de nada.
 * - **502/503/504** — el proveedor no respondió. Es el único caso donde esperar y reintentar es
 *   la respuesta correcta.
 * - **sin respuesta** — no se llegó al servidor (red caída, backend apagado, rewrite mal
 *   apuntado).
 */
export function toPaymentsError(error: unknown): PaymentsError {
  if (!isAxiosError(error)) {
    return new PaymentsError(
      'unknown',
      null,
      error instanceof Error ? error.message : 'Error desconocido',
    );
  }

  const status = error.response?.status ?? null;
  const message = error.message;

  if (status === null) {
    return new PaymentsError('network', null, message);
  }

  if (status === 401 || status === 403) {
    return new PaymentsError('unauthorized', status, message);
  }

  if (status === 404) {
    return new PaymentsError('not-found', status, message);
  }

  if (status >= 500 && status < 502) {
    return new PaymentsError('misconfigured', status, message);
  }

  if (status >= 502) {
    return new PaymentsError('unavailable', status, message);
  }

  return new PaymentsError('unknown', status, message);
}

interface PaymentsErrorPresentation {
  title: string;
  description: string;
  /** Si no, se oculta el botón: ofrecer "Reintentar" donde no puede funcionar es una burla. */
  canRetry: boolean;
}

const PRESENTATION: Record<PaymentsErrorKind, PaymentsErrorPresentation> = {
  unauthorized: {
    title: 'Tu sesión expiró',
    description: 'Vuelve a iniciar sesión para ver los planes disponibles.',
    canRetry: false,
  },
  'not-found': {
    title: 'La sección de pagos no está disponible',
    description:
      'Este servidor no expone el catálogo de servicios. Si acabas de cambiar de entorno, avísale al equipo: no es algo que puedas resolver desde aquí.',
    canRetry: false,
  },
  misconfigured: {
    title: 'El servicio de pagos no está configurado',
    description:
      'El servidor no pudo comunicarse con el proveedor de pagos por un problema de configuración. Reintentar no va a ayudar; avísale al equipo de soporte.',
    canRetry: false,
  },
  unavailable: {
    title: 'El proveedor de pagos no responde',
    description:
      'Es un problema temporal del proveedor. No se realizó ningún cargo: espera unos minutos y vuelve a intentarlo.',
    canRetry: true,
  },
  network: {
    title: 'No pudimos conectarnos',
    description:
      'No se pudo alcanzar el servidor. Revisa tu conexión y vuelve a intentarlo.',
    canRetry: true,
  },
  unknown: {
    title: 'No pudimos cargar los planes',
    description:
      'Hubo un problema al comunicarnos con el servicio de pagos. No se realizó ningún cargo.',
    canRetry: true,
  },
};

/**
 * Qué mostrar en la pantalla de error.
 *
 * Acepta un `Error` cualquiera —es lo que recibe un error boundary— y cae al mensaje genérico si
 * no es uno nuestro: un fallo de render inesperado no debe acabar diciéndole al usuario que el
 * proveedor de pagos está caído.
 */
export function describePaymentsError(error: unknown): PaymentsErrorPresentation & {
  status: number | null;
} {
  const kind =
    error instanceof PaymentsError ? error.kind : ('unknown' as const);
  const status = error instanceof PaymentsError ? error.status : null;

  return { ...PRESENTATION[kind], status };
}
