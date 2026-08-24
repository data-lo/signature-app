'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VerificationQrPanelProps {
  /** URL hospedada de Didit. */
  url: string;
}

/** Cuánto se muestra el "copiado" antes de volver al rótulo normal. */
const COPIED_FEEDBACK_MS = 2_000;

/**
 * El QR y las dos salidas del flujo: seguir en el celular o seguir en este equipo.
 *
 * **Por qué el QR se dibuja acá y no lo manda el backend como data URI.** Se evaluaron las dos
 * opciones y esta gana en los tres criterios:
 *
 * - Seguridad: no expone nada nuevo. La URL hospedada ya viaja en la misma respuesta JSON —la
 *   pantalla la necesita para "Abrir verificación" y "Copiar enlace"—, así que codificarla como
 *   QR en el navegador no agrega ningún secreto al tráfico. Y el paquete no arrastra
 *   dependencias propias (`qrcode.react` declara cero), así que la superficie de cadena de
 *   suministro es un paquete, no un árbol.
 * - Costo: este QR vive en el endpoint que se sondea cada 5 s. Un PNG en data URI mide ~2.5 KB
 *   contra los ~68 bytes de la URL: 37x más en CADA sondeo (~89 KB extra por usuario en una
 *   verificación de tres minutos). Dibujarlo en el cliente cuesta cero bytes de red.
 * - Robustez: el SVG se ve nítido a cualquier tamaño y densidad de pantalla —un raster escalado
 *   lo leen peor las cámaras—, y el código siempre se deriva de la URL que hay en estado, así
 *   que no puede quedar desincronizado del enlace que abren los botones ni hay que invalidar
 *   ningún cache cuando la sesión rota.
 *
 * "Copiar enlace" existe para el caso en que la cámara no lee el código (pantalla con brillo
 * bajo, cámara vieja): sin esa salida el usuario se queda sin forma de continuar.
 */
export default function VerificationQrPanel({ url }: VerificationQrPanelProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    } catch {
      // Navegador sin permiso de portapapeles: el enlace sigue disponible en "Abrir
      // verificación", así que no se interrumpe el flujo con un error.
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">
        Escanea el QR con tu celular o abre la verificación en este equipo.
      </p>

      <div className="flex justify-center">
        <div className="rounded-lg bg-white p-4">
          <QRCodeSVG
            value={url}
            size={168}
            // El QR se lee por contraste: se fija el par de colores en vez de heredar el tema,
            // porque en modo oscuro un código claro sobre fondo oscuro no lo lee ninguna cámara.
            bgColor="#ffffff"
            fgColor="#000000"
            aria-label="Código QR para continuar la verificación en tu celular"
          />
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <Button
          variant="default"
          size="sm"
          render={
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
              Abrir verificación
            </a>
          }
        />

        <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? 'Enlace copiado' : 'Copiar enlace'}
        </Button>
      </div>
    </div>
  );
}
