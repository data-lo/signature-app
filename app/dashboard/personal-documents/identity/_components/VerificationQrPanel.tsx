'use client';

import { QRCodeSVG } from 'qrcode.react';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VerificationQrPanelProps {
  /** URL hospedada de Didit: es lo que codifica el QR y lo que abre el botón. */
  url: string;
}

/**
 * Esquemas con los que se admite abrir el enlace.
 *
 * La lista blanca no es celo defensivo: la URL viene de un proveedor externo y termina en el
 * `href` de un enlace, así que un valor con esquema `javascript:` se ejecutaría al pulsarlo. Sólo
 * se abre lo que es navegación web.
 */
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

/**
 * Comprueba que el enlace sirva para lo que se va a usar: codificarlo en el QR y abrirlo.
 *
 * Una cadena que no sea una URL absoluta válida no lleva a ninguna parte —ni escaneada ni
 * pulsada—, así que dibujar el código con ella sería enseñar un QR muerto.
 */
function isOpenableUrl(url: string): boolean {
  try {
    return ALLOWED_PROTOCOLS.includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

/**
 * El QR con el que el usuario continúa la verificación en su celular, y el botón para abrirla en
 * este mismo equipo.
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
 * **El botón de abrir la verificación está de vuelta.** Se había retirado junto con "Copiar
 * enlace" para dejar el QR como única salida, pero eso deja sin camino a quien ya está en el
 * dispositivo desde el que quiere verificarse: escanear el código de la propia pantalla con esa
 * misma pantalla es imposible, y en un teléfono —donde esta tarjeta también se muestra— era la
 * situación normal, no la rara. "Copiar enlace" sigue sin volver: no abre nada por sí solo, y era
 * el tercer camino que obligaba a explicar en pantalla cuál convenía.
 *
 * La URL se sigue sin mostrar como texto. Se codifica y se enlaza, pero un renglón con la URL
 * cruda no le dice nada a nadie y llenaba la tarjeta.
 */
export default function VerificationQrPanel({ url }: VerificationQrPanelProps) {
  /**
   * Estado seguro: sin un enlace utilizable no se dibuja ni el QR ni el botón.
   *
   * Quien monta esta tarjeta ya comprueba que exista `url` (ver `DiditVerificationCard`), así que
   * esto cubre lo que aquella comprobación no puede: una cadena presente pero inservible. Y se
   * ocultan LOS DOS, no sólo el botón — un QR que codifica algo que no es una URL no inicia
   * ninguna verificación, y enseñarlo haría creer al usuario que el problema es su cámara.
   */
  if (!isOpenableUrl(url)) {
    return (
      <p className="text-sm text-muted-foreground">
        No se pudo generar el enlace de verificación. Vuelve a iniciar el
        proceso para obtener uno nuevo.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">
        Escanea el código QR para iniciar el proceso de verificación, o ábrela
        en este dispositivo.
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

      {/* Al final de la sección y alineado a la derecha, como el resto de acciones de la app. */}
      <div className="flex justify-end">
        <Button
          variant="default"
          size="sm"
          /**
           * Un enlace de verdad y no un `onClick` con `window.open`: se puede abrir en otra
           * pestaña con el clic central, se copia con el menú contextual y los lectores de
           * pantalla lo anuncian como enlace. `rel="noopener noreferrer"` porque el destino es un
           * dominio externo (Didit).
           */
          render={<a href={url} target="_blank" rel="noopener noreferrer" />}
        >
          <ExternalLink className="size-4" />
          Abrir verificación
        </Button>
      </div>
    </div>
  );
}
