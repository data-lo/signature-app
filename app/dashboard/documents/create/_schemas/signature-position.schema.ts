import { z } from 'zod';

/**
 * Una ubicación de firma sobre una página, en ratios 0-1 relativos al tamaño de ESA página (no
 * píxeles absolutos) — permite que la misma posición relativa se vea igual sin importar el
 * ancho al que el usuario esté viendo el PDF renderizado. `id` es un identificador de cliente
 * (generado al soltar la firma) usado para mover/borrar esa entrada específica del arreglo del
 * firmante; el backend lo recibe como `signatureId` (ver `_mappers/`).
 */
// widthRatio/heightRatio se validan como número en rango (no z.literal) a propósito: fijar el
// tipo a la constante exacta obligaría a `resolveSignatureDrop`/`SignatureBox` a pelear con el
// widening de TypeScript en cada objeto que arma un candidato — el tamaño fijo/no-redimensionable
// ya lo garantiza la UI (SignatureBox nunca renderiza asas de resize ni permite otro valor), no
// hace falta que el tipo lo repita.
export const signaturePositionSchema = z.object({
  id: z.string(),
  page: z.number().int().min(1),
  xRatio: z.number().min(0).max(1),
  yRatio: z.number().min(0).max(1),
  widthRatio: z.number().min(0).max(1),
  heightRatio: z.number().min(0).max(1),
});

export type SignaturePosition = z.infer<typeof signaturePositionSchema>;
