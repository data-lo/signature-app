'use client';

import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { Ref } from 'react';
import { Field, FieldError } from '@/components/ui/field';

/** `render=explicit` en vez del render automático: así el widget se monta cuando React ya puso el contenedor en el DOM, y se puede reiniciar por id. */
const TURNSTILE_SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface TurnstileRenderOptions {
  sitekey: string;
  callback: (token: string) => void;
  'expired-callback': () => void;
  'error-callback': () => void;
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

/**
 * Widget de Cloudflare Turnstile (ver historia "Implementar Cloudflare Turnstile en el registro
 * de usuarios"). Solo produce el token; quién puede enviar el formulario y cuándo se reinicia el
 * reto lo decide el formulario que lo usa.
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
  const [failedToLoad, setFailedToLoad] = useState(false);

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

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) {
          return;
        }

        widgetIdRef.current =
          window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            callback: (token) => callbacksRef.current.onVerify(token),
            'expired-callback': () => callbacksRef.current.onExpire?.(),
            'error-callback': () => callbacksRef.current.onError?.(),
            theme: 'auto',
          }) ?? null;
      })
      .catch(() => {
        if (!cancelled) {
          setFailedToLoad(true);
          callbacksRef.current.onError?.();
        }
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current) {
        window.turnstile?.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]);

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (widgetIdRef.current) {
        window.turnstile?.reset(widgetIdRef.current);
      }
    },
  }));

  // Sin clave configurada no hay reto que resolver. Se avisa en pantalla (y no en silencio)
  // porque el formulario va a bloquear el envío: sin este mensaje, el usuario vería un botón que
  // "no hace nada" sin explicación.
  if (!siteKey || failedToLoad) {
    return (
      <Field>
        <FieldError>
          No se pudo cargar la verificación anti-bots. Recarga la página e
          intenta de nuevo.
        </FieldError>
      </Field>
    );
  }

  return <div ref={containerRef} data-slot="turnstile-widget" />;
}
