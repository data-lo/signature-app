import {
  EMPTY_DATE_PLACEHOLDER,
  formatLongDateTime,
  formatShortDate,
} from './format-datetime';

/**
 * Las fechas se construyen con el constructor de componentes locales (no con strings ISO en UTC)
 * a propósito: `formatLongDateTime` formatea en la zona del navegador, así que un literal como
 * '2026-03-15T23:55:00.000Z' daría un resultado distinto según la zona en la que corran los tests.
 */
describe('formatLongDateTime', () => {
  it('usa el formato legible del módulo de documentos: día de la semana, día, mes y hora de 12h', () => {
    expect(formatLongDateTime(new Date(2026, 2, 15, 23, 55))).toBe(
      'Domingo 15 de marzo, 11:55 PM',
    );
  });

  it('formatea el mediodía como 12 PM y la medianoche como 12 AM (y no como 0)', () => {
    expect(formatLongDateTime(new Date(2026, 2, 16, 12, 0))).toBe(
      'Lunes 16 de marzo, 12:00 PM',
    );
    expect(formatLongDateTime(new Date(2026, 2, 16, 0, 5))).toBe(
      'Lunes 16 de marzo, 12:05 AM',
    );
  });

  it('rellena los minutos a dos dígitos', () => {
    expect(formatLongDateTime(new Date(2026, 0, 2, 9, 7))).toContain('9:07 AM');
  });

  it('acepta la fecha ISO tal como llega del backend', () => {
    const iso = new Date(2026, 2, 15, 23, 55).toISOString();
    expect(formatLongDateTime(iso)).toBe('Domingo 15 de marzo, 11:55 PM');
  });

  it('devuelve el marcador vacío si no hay fecha o si no es parseable', () => {
    expect(formatLongDateTime(null)).toBe(EMPTY_DATE_PLACEHOLDER);
    expect(formatLongDateTime(undefined)).toBe(EMPTY_DATE_PLACEHOLDER);
    expect(formatLongDateTime('')).toBe(EMPTY_DATE_PLACEHOLDER);
    expect(formatLongDateTime('no-es-una-fecha')).toBe(EMPTY_DATE_PLACEHOLDER);
  });
});

/** Formato de las columnas de fecha del listado de documentos. */
describe('formatShortDate', () => {
  it('usa DD/MM/YYYY', () => {
    expect(formatShortDate(new Date(2026, 4, 10, 9, 30))).toBe('10/05/2026');
  });

  it('rellena con ceros el día y el mes de un solo dígito', () => {
    expect(formatShortDate(new Date(2026, 0, 2))).toBe('02/01/2026');
  });

  it('acepta la fecha ISO tal como llega del backend', () => {
    const iso = new Date(2026, 2, 15, 23, 55).toISOString();

    expect(formatShortDate(iso)).toBe('15/03/2026');
  });

  it('devuelve el marcador vacío si no hay fecha o no es parseable', () => {
    expect(formatShortDate(null)).toBe(EMPTY_DATE_PLACEHOLDER);
    expect(formatShortDate(undefined)).toBe(EMPTY_DATE_PLACEHOLDER);
    expect(formatShortDate('')).toBe(EMPTY_DATE_PLACEHOLDER);
    expect(formatShortDate('no-es-una-fecha')).toBe(EMPTY_DATE_PLACEHOLDER);
  });

  /** El listado lo usa para decir "No disponible" en la columna "Fecha de firma". */
  it('permite sustituir ese marcador por el texto que pida quien la llama', () => {
    expect(formatShortDate(null, 'No disponible')).toBe('No disponible');
    expect(formatShortDate('no-es-una-fecha', 'No disponible')).toBe(
      'No disponible',
    );
    expect(formatShortDate(new Date(2026, 4, 10), 'No disponible')).toBe(
      '10/05/2026',
    );
  });
});
