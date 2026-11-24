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
 * El formateo de importes se comparte con la compra de documentos desde suscripciones, así que
 * vive en `lib/format-currency`. Se re-exporta desde aquí para no tocar a quien ya lo importaba
 * de este módulo, y para que siga habiendo UNA sola implementación.
 */
export { formatAmount } from '@/lib/format-currency';

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

/** Periodicidades de Stripe como adjetivo del plan ("Plan mensual"). */
const CADENCE_ADJECTIVES: Record<string, string> = {
  day: 'diario',
  week: 'semanal',
  month: 'mensual',
  year: 'anual',
};

/**
 * Rótulo de la periodicidad para el encabezado de la tarjeta: "Plan mensual", "Plan anual",
 * "Plan cada 3 meses" o "Pago único" cuando no hay recurrencia.
 *
 * @param interval - Periodicidad de Stripe (`month`, `year`…), o `null` en un pago único.
 * @param intervalCount - Cada cuántos `interval` se cobra; `null` equivale a 1.
 * @returns El rótulo en sentence case.
 * @throws Nunca lanza.
 *
 * @example
 * ```ts
 * formatPlanCadence('month', 1); // 'Plan mensual'
 * formatPlanCadence('month', 3); // 'Plan cada 3 meses'
 * formatPlanCadence(null, null); // 'Pago único'
 * ```
 */
export function formatPlanCadence(
  interval: string | null,
  intervalCount: number | null,
): string {
  if (!interval) {
    return 'Pago único';
  }

  const count = intervalCount ?? 1;
  const adjective = CADENCE_ADJECTIVES[interval];
  if (count === 1 && adjective) {
    return `Plan ${adjective}`;
  }

  // "cada 3 meses" ya lo resuelve `formatInterval`, incluidas las periodicidades sin rotular.
  return `Plan ${formatInterval(interval, count).replace(/^al /, 'cada ')}`;
}
