import { formatPersonName } from './format-person-name';

describe('formatPersonName', () => {
  it.each([
    ['juan pérez', 'Juan Pérez'],
    ['MARÍA DEL CARMEN', 'María Del Carmen'],
    ['  ana   lopez  ', 'Ana Lopez'],
  ])('normaliza %s a %s', (input, expected) => {
    expect(formatPersonName(input)).toBe(expected);
  });

  describe('nombres y apellidos compuestos', () => {
    it('capitaliza cada palabra de un nombre compuesto', () => {
      expect(formatPersonName('juan carlos')).toBe('Juan Carlos');
    });

    it('capitaliza cada palabra de un apellido compuesto', () => {
      expect(formatPersonName('de la cruz mendoza')).toBe('De La Cruz Mendoza');
    });
  });

  describe('valores en mayúsculas', () => {
    it('baja a minúscula el resto de cada palabra', () => {
      expect(formatPersonName('ISAAY SOSA')).toBe('Isaay Sosa');
    });

    it('conserva los acentos y la ñ', () => {
      expect(formatPersonName('JOSÉ MUÑOZ')).toBe('José Muñoz');
    });
  });

  describe('espacios adicionales', () => {
    it('elimina los espacios iniciales y finales', () => {
      expect(formatPersonName('   Ana   ')).toBe('Ana');
    });

    it('colapsa los espacios consecutivos entre palabras', () => {
      expect(formatPersonName('ana     maria     lopez')).toBe(
        'Ana Maria Lopez',
      );
    });

    /** Tabuladores y saltos de línea llegan al pegar desde otra aplicación. */
    it('trata cualquier espacio en blanco como separador', () => {
      expect(formatPersonName('ana\tmaria\nlopez')).toBe('Ana Maria Lopez');
    });

    it('un valor de puros espacios queda vacío', () => {
      expect(formatPersonName('   ')).toBe('');
    });
  });

  /**
   * Se aplica dos veces en el mismo camino —al perder el foco el campo y al enviar, vía el
   * esquema—, así que aplicarla sobre su propio resultado no puede degradarlo.
   */
  it('es idempotente', () => {
    expect(formatPersonName(formatPersonName('MARÍA DEL CARMEN'))).toBe(
      'María Del Carmen',
    );
  });
});
