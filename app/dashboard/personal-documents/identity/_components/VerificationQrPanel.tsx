'use client';

import { QRCodeSVG } from 'qrcode.react';

interface VerificationQrPanelProps {
  /** URL hospedada de Didit. Sólo se usa como contenido del QR: nunca se muestra ni se enlaza. */
  url: string;
}

/**
 * El QR con el que el usuario continúa la verificación en su celular.
 *
 * **Por qué el QR se dibuja acá y no lo manda el backend como data URI.** Se evaluaron las dos
 * opciones y esta gana en los tres criterios:
 *
 * - Costo: este QR vive en el endpoint que se sondea cada 5 s. Un PNG en data URI mide ~2.5 KB
 *   contra los ~68 bytes de la URL: 37x más en CADA sondeo (~89 KB extra por usuario en una
 *   verificación de tres minutos). Dibujarlo en el cliente cuesta cero bytes de red.
 * - Robustez: el SVG se ve nítido a cualquier tamaño y densidad de pantalla —un raster escalado
 *   lo leen peor las cámaras—, y el código siempre se deriva de la URL que hay en estado, así
 *   que no hay que invalidar ningún cache cuando la sesión rota.
 * - Dependencias: `qrcode.react` declara cero, así que la superficie de cadena de suministro es
 *   un paquete, no un árbol.
 *
 * **El QR es la única salida hacia Didit.** Antes esta tarjeta ofrecía además "Abrir
 * verificación" y "Copiar enlace"; los dos se eliminaron junto con el rótulo que describía la
 * URL. La URL sigue viajando en la respuesta porque es lo que el QR codifica, pero no se
 * muestra, no se enlaza y no se copia: escanear con el celular es el camino previsto, y sostener
 * tres caminos para lo mismo obligaba a explicar en pantalla cuál convenía.
 */
export default function VerificationQrPanel({ url }: VerificationQrPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">
        Escanea el código QR para iniciar el proceso de verificación.
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
    </div>
  );
}
