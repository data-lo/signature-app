import { registerSchema } from './_schemas';

const validData = {
  firstName: 'Juan',
  lastName: 'Pérez',
  email: 'juan.perez@empresa.com',
  nationalId: 'PELJ850101HDFRNN08',
  rfc: 'PELJ850101ABC',
  password: 'supersecret123',
  confirmPassword: 'supersecret123',
};

describe('registerSchema', () => {
  it('acepta datos válidos, incluyendo el RFC', () => {
    const result = registerSchema.safeParse(validData);

    expect(result.success).toBe(true);
  });

  it('rechaza si el CURP no tiene 18 caracteres', () => {
    const result = registerSchema.safeParse({
      ...validData,
      nationalId: 'CORTO',
    });

    expect(result.success).toBe(false);
  });

  it('rechaza si el RFC tiene menos de 12 caracteres', () => {
    const result = registerSchema.safeParse({ ...validData, rfc: 'CORTO' });

    expect(result.success).toBe(false);
  });

  it('rechaza si el RFC tiene caracteres no alfanuméricos', () => {
    const result = registerSchema.safeParse({
      ...validData,
      rfc: 'PELJ850101-BC',
    });

    expect(result.success).toBe(false);
  });

  it('rechaza si las contraseñas no coinciden', () => {
    const result = registerSchema.safeParse({
      ...validData,
      confirmPassword: 'otra-contraseña',
    });

    expect(result.success).toBe(false);
  });
  /**
   * Historia "Capitalizar nombre y apellido". La normalización vive en el esquema para que
   * cubra cualquier camino de envío, así que se prueba acá y no sólo a través del formulario.
   */
  describe('capitalización del nombre y el apellido', () => {
    function parseNames(firstName: string, lastName: string) {
      const result = registerSchema.safeParse({
        ...validData,
        firstName,
        lastName,
      });

      if (!result.success) {
        throw new Error('el esquema rechazó datos que debían ser válidos');
      }

      return { firstName: result.data.firstName, lastName: result.data.lastName };
    }

    it.each([
      ['nombre compuesto', 'juan carlos', 'pérez', 'Juan Carlos', 'Pérez'],
      [
        'apellido compuesto',
        'ana',
        'de la cruz mendoza',
        'Ana',
        'De La Cruz Mendoza',
      ],
      [
        'valores en mayúsculas',
        'MARÍA DEL CARMEN',
        'GÓMEZ',
        'María Del Carmen',
        'Gómez',
      ],
      [
        'espacios adicionales',
        '  ana   maria  ',
        '  lopez   soto ',
        'Ana Maria',
        'Lopez Soto',
      ],
    ])('normaliza %s', (_caso, firstName, lastName, expectedFirst, expectedLast) => {
      expect(parseNames(firstName, lastName)).toEqual({
        firstName: expectedFirst,
        lastName: expectedLast,
      });
    });

    /** Un campo de puros espacios no captura ningún nombre: se rechaza como vacío. */
    it.each(['', '   '])('rechaza un nombre de %p', (firstName) => {
      const result = registerSchema.safeParse({ ...validData, firstName });

      expect(result.success).toBe(false);
    });

    /** El CURP y el RFC conservan su forma canónica: no se capitalizan. */
    it('no toca el resto de los campos', () => {
      const result = registerSchema.safeParse({
        ...validData,
        firstName: 'ana',
        lastName: 'lopez',
      });

      expect(result.success && result.data).toMatchObject({
        email: 'juan.perez@empresa.com',
        nationalId: 'PELJ850101HDFRNN08',
        rfc: 'PELJ850101ABC',
      });
    });
  });
});