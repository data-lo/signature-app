/**
 * Formatea un importe con la moneda que reporta el proveedor de pagos.
 *
 * Vive en `lib/` y no dentro de una ruta porque lo usan dos pantallas —el catálogo de planes y la
 * compra de documentos desde suscripciones— y un importe formateado de dos maneras distintas en
 * la misma aplicación se lee como dos precios distintos.
 *
 * Stripe entrega centavos (`unitAmount: 49900` = $499.00) y el código ISO en minúsculas, que
 * `Intl` exige en mayúsculas. Se divide entre 100 porque todas las monedas que manejamos son de
 * dos decimales; si alguna vez se vendiera en una de cero decimales (JPY, CLP), éste es el único
 * lugar que hay que ajustar.
 *
 * @param unitAmount - Importe en la unidad mínima de la moneda, o `null` si no está fijado.
 * @param currency - Código ISO de la moneda en minúsculas (`mxn`, `usd`).
 * @returns El importe listo para pintar, o "Precio a consultar" si no hay importe.
 *
 * @example
 * ```ts
 * formatAmount(3900, 'mxn'); // "$39.00"
 * formatAmount(null, 'mxn'); // "Precio a consultar"
 * ```
 */
export function formatAmount(
  unitAmount: number | null,
  currency: string,
): string {
  if (unitAmount === null) {
    return 'Precio a consultar';
  }

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(unitAmount / 100);
}
