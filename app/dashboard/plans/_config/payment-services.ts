/**
 * Presentación del catálogo. El contenido —qué servicios hay, cómo se llaman y cuánto cuestan—
 * viene de Stripe; acá sólo vive cómo se muestra.
 */

/** Periodicidades de Stripe rotuladas en español, en singular y en plural. */
const INTERVAL_LABELS: Record<string, { one: string; many: string }> = {
  day: { one: 'día', many: 'días' },
  week: { one: 'semana', many: 'semanas' },
  month: { one: 'mes', many: 'meses' },
  year: { one: 'año', many: 'años' },
};

/**
 * Formatea el importe con la moneda que reporta Stripe.
 *
 * Stripe entrega centavos (`unitAmount: 49900` = $499.00) y el código ISO en minúsculas, que
 * `Intl` exige en mayúsculas. Se divide entre 100 porque todas las monedas que manejamos son de
 * dos decimales; si alguna vez se vendiera en una de cero decimales (JPY, CLP), este es el
 * único lugar que hay que ajustar.
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

/**
 * "al mes", "cada 3 meses", o cadena vacía en un pago único.
 *
 * Se devuelve vacío en vez de "pago único" para que la tarjeta decida cómo rotularlo: el
 * importe ya se entiende solo cuando no hay recurrencia.
 */
export function formatInterval(
  interval: string | null,
  intervalCount: number | null,
): string {
  if (!interval) {
    return '';
  }

  const labels = INTERVAL_LABELS[interval];
  if (!labels) {
    // Periodicidad que Stripe agregue y todavía no rotulemos: se muestra tal cual antes que
    // mentir sobre cada cuánto se cobra.
    return `cada ${intervalCount ?? 1} ${interval}`;
  }

  const count = intervalCount ?? 1;

  return count === 1 ? `al ${labels.one}` : `cada ${count} ${labels.many}`;
}
