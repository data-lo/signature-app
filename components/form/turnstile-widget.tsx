'use client';

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import type { Ref } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldError } from '@/components/ui/field';

/** `render=explicit` en vez del render automático: así el widget se monta cuando React ya puso el contenedor en el DOM, y se puede reiniciar por id. */
const TURNSTILE_SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface TurnstileRenderOptions {
  sitekey: string;
  callback: (token: string) => void;
  'expired-callback': () => void;
  'error-callback': (code?: string) => void;
  theme?: 'auto' | 'light' | 'dark';
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: TurnstileRenderOptions,
      ) => string | undefined;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

/**
 * El script se comparte entre todos los widgets de la sesión, así que la promesa se cachea a
 * nivel de módulo: montar el formulario dos veces (o navegar y volver) no debe inyectar dos
 * `<script>` ni descargar la librería de nuevo. Si la carga falla, se limpia la caché para que
 * un montaje posterior pueda reintentar en vez de quedarse con el rechazo pegado.
 */
let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) {
    return Promise.resolve();
  }

  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Se descarta el `<script>` muerto además de la promesa: un reintento inyecta uno nuevo, y
      // sin esto el `<head>` iría acumulando una etiqueta rota por intento.
      script.remove();
      scriptPromise = null;
      reject(new Error('No se pudo cargar el script de Cloudflare Turnstile'));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export interface TurnstileWidgetHandle {
  /** Descarta el token actual y pide un reto nuevo — el token es de un solo uso, así que hay que llamarlo tras cada intento de envío fallido. */
  reset: () => void;
}

interface TurnstileWidgetProps {
  /**
   * Clave PÚBLICA del widget (`TURNSTILE_SITE_KEY`). Llega desde el servidor del frontend como
   * prop; la clave secreta correspondiente vive solo en signature-server y nunca toca el cliente.
   */
  siteKey?: string;
  /** Recibe el token de un solo uso que hay que mandar al backend junto con el registro. */
  onVerify: (token: string) => void;
  /** El reto caducó (Turnstile los vence a los ~5 minutos): el token ya no sirve. */
  onExpire?: () => void;
  /** El widget no pudo montarse o el reto falló del lado de Cloudflare. */
  onError?: () => void;
  ref?: Ref<TurnstileWidgetHandle>;
}

/** El widget no llegó a montarse: script bloqueado, API ausente o clave rechazada para el dominio. */
const UNAVAILABLE_MESSAGE =
  'No se pudo cargar la verificación anti-bots. Revisa tu conexión e intenta de nuevo.';

/** El widget sí se montó, pero el reto de Cloudflare terminó en error (`error-callback`). */
const CHALLENGE_FAILED_MESSAGE =
  'La verificación anti-bots no pudo completarse. Intenta de nuevo.';

/** Falta `TURNSTILE_SITE_KEY`: es un problema de despliegue, reintentar no lo arregla. */
const MISSING_KEY_MESSAGE =
  'No se pudo cargar la verificación anti-bots. Recarga la página e intenta de nuevo.';

/**
 * Widget de Cloudflare Turnstile (ver historia "Implementar Cloudflare Turnstile en el registro
 * de usuarios"). Solo produce el token; quién puede enviar el formulario y cuándo se reinicia el
 * reto lo decide el formulario que lo usa.
 *
 * Todo camino de fallo termina en un aviso con botón "Reintentar" en vez de un hueco silencioso.
 * El reto falla de verdad en navegadores normales (extensiones de privacidad, VPN, red inestable
 * → `error-callback` con códigos 300xxx/600xxx), y antes de esto el usuario se quedaba con el
 * widget en blanco o en error, el botón de envío rechazándolo por "completa la verificación" y
 * ninguna forma de reintentar salvo recargar la página a mano.
 */
export function TurnstileWidget({
  siteKey,
  onVerify,
  onExpire,
  onError,
  ref,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [failure, setFailure] = useState<'unavailable' | 'challenge' | null>(
    null,
  );
  /** Cambiarlo vuelve a correr el efecto: es el "reintentar" cuando ni siquiera hay widget montado. */
  const [mountAttempt, setMountAttempt] = useState(0);

  // Los callbacks se leen desde refs y no se declaran como dependencias del efecto: vienen de
  // funciones nuevas en cada render del formulario, y usarlas directamente volvería a montar el
  // widget en cada tecleo del usuario (perdiendo el reto ya resuelto).
  const callbacksRef = useRef({ onVerify, onExpire, onError });
  callbacksRef.current = { onVerify, onExpire, onError };

  useEffect(() => {
    if (!siteKey) {
      return;
    }

    let cancelled = false;

    const failToMount = () => {
      if (cancelled) return;
      setFailure('unavailable');
      callbacksRef.current.onError?.();
    };

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current) {
          return;
        }

        const api = window.turnstile;
        // El script cargó pero no publicó su API: antes el componente se quedaba sin widget y sin
        // aviso, con el formulario bloqueado y ninguna explicación en pantalla.
        if (!api) {
          failToMount();
          return;
        }

        // Se llama a `render` directo y NO a través de `turnstile.ready()`: `ready()` está pensado
        // para encolar trabajo ANTES de que api.js cargue, y con el script ya cargado Cloudflare
        // descarta el callback con una advertencia en consola — el widget nunca se montaba.
        let widgetId: string | undefined;
        try {
          widgetId = api.render(containerRef.current, {
            sitekey: siteKey,
            callback: (token) => {
              setFailure(null);
              callbacksRef.current.onVerify(token);
            },
            'expired-callback': () => callbacksRef.current.onExpire?.(),
            // Cloudflare reintenta por su cuenta los códigos recuperables y pinta su propio
            // error dentro del widget; este aviso es para cuando ese reintento tampoco prospera.
            'error-callback': () => {
              if (cancelled) return;
              setFailure('challenge');
              callbacksRef.current.onError?.();
            },
            theme: 'auto',
          });
        } catch {
          failToMount();
          return;
        }

        // `render` devuelve `undefined` cuando Cloudflare rechaza la clave para este dominio.
        if (!widgetId) {
          failToMount();
          return;
        }

        widgetIdRef.current = widgetId;
      })
      .catch(failToMount);

    return () => {
      cancelled = true;
      if (widgetIdRef.current) {
        // `remove` lanza si Cloudflare ya descartó el widget (pasa con el doble montaje de
        // StrictMode y con Fast Refresh): desmontar el formulario no debe tumbar la página.
        try {
          window.turnstile?.remove(widgetIdRef.current);
        } catch {
          // El widget ya no existe del lado de Cloudflare; no hay nada que limpiar.
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, mountAttempt]);

  /** `true` si había un widget montado al que pedirle un reto nuevo. */
  const resetWidget = useCallback(() => {
    if (!widgetIdRef.current) {
      return false;
    }
    try {
      window.turnstile?.reset(widgetIdRef.current);
      return true;
    } catch {
      return false;
    }
  }, []);

  useImperativeHandle(ref, () => ({
    reset: () => {
      resetWidget();
    },
  }));

  /** Reintento del usuario: reinicia el reto si hay widget, y si no, vuelve a montarlo desde cero. */
  const retry = useCallback(() => {
    setFailure(null);
    if (!resetWidget()) {
      setMountAttempt((attempt) => attempt + 1);
    }
  }, [resetWidget]);

  // Sin clave configurada no hay reto posible y reintentar no arregla nada. Se avisa en pantalla
  // y no en silencio, porque el formulario va a bloquear el envío.
  if (!siteKey) {
    return (
      <Field>
        <FieldError>{MISSING_KEY_MESSAGE}</FieldError>
      </Field>
    );
  }

  return (
    <Field>
      {/* El contenedor se mantiene montado aunque haya error: Cloudflare pinta ahí su propio
          reintento automático, y `reset()` necesita que el nodo siga existiendo. */}
      <div ref={containerRef} data-slot="turnstile-widget" />
      {failure && (
        <>
          <FieldError>
            {failure === 'unavailable'
              ? UNAVAILABLE_MESSAGE
              : CHALLENGE_FAILED_MESSAGE}
          </FieldError>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={retry}
          >
            Reintentar verificación
          </Button>
        </>
      )}
    </Field>
  );
}
