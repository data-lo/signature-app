'use client';

import { useSearchParams } from 'next/navigation';
import type { PublicSigner } from '../_requests';

/**
 * Parámetro con el que el QR de una firma avanzada señala a su firmante.
 *
 * Lo escribe el backend en `buildAdvancedSignatureUrl` (`ADVANCED_SIGNATURE_QUERY_PARAM` en
 * `signature-server`). Se declara acá otra vez porque son dos repos sin paquete compartido —el
 * mismo criterio que la matemática de colisión de `lib/signature-geometry.ts`—; si alguno de los
 * dos lo renombrara, el QR abriría la vista pública sin resaltar a nadie, así que la prueba del
 * lado del backend afirma explícitamente el nombre que publica.
 */
export const HIGHLIGHTED_SIGNER_PARAM = 'firma';

/**
 * Firmante que hay que resaltar, según el QR que se escaneó.
 *
 * Devuelve `null` salvo que el parámetro corresponda a un firmante DE ESTE documento. Ese filtro
 * es el criterio "si el parámetro no existe, es inválido o la firma no pertenece al documento, la
 * vista pública carga normalmente sin resaltar información incorrecta": un id de otro documento,
 * o basura pegada a mano en la barra de direcciones, no debe pintar nada —ni un recuadro vacío ni,
 * peor, el firmante equivocado por coincidir de posición—.
 *
 * No hace falta validar el formato del id: se compara contra los firmantes que el backend ya
 * publicó, así que sólo lo que existe puede resaltarse.
 */
export function useHighlightedSigner(
  signers: PublicSigner[] | undefined,
): string | null {
  /**
   * Lectura defensiva: `useSearchParams` devuelve `null` cuando no hay router montado —fuera del
   * App Router y en pruebas de unidad—, aunque su tipo no lo declare. Sin router no hay parámetro
   * que leer, que es exactamente el caso "no se pidió resaltar a nadie".
   */
  const searchParams = useSearchParams();
  const requested = searchParams?.get(HIGHLIGHTED_SIGNER_PARAM);

  if (!requested || !signers) {
    return null;
  }

  return signers.some((signer) => signer.id === requested) ? requested : null;
}
