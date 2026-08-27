import { editPreRegistrationSchema } from './_schemas';

/**
 * El formulario siempre manda todas las claves —react-hook-form las inicializa en cadena
 * vacía—, y es el esquema el que convierte las vacías en `undefined` ("no lo cambies"). Las
 * pruebas replican ese contrato en vez de omitir claves, que el esquema rechaza.
 */
const validData = {
  email: 'juan.perez@empresa.com',
  password: 'supersecret123',
  firstName: '',
  lastName: '',
  nationalId: '',
  rfc: '',
};

function parse(overrides: Record<string, unknown>) {
  const result = editPreRegistrationSchema.safeParse({
    ...validData,
    ...overrides,
  });

  if (!result.success) {
    throw new Error('el esquema rechazó datos que debían ser válidos');
  }

  return result.data;
}

describe('editPreRegistrationSchema', () => {
  /**
   * Es la única pantalla donde el usuario corrige su nombre después de registrarse, así que
   * normaliza con el mismo criterio que el alta: si no, un mismo usuario quedaría guardado de
   * dos formas distintas según por dónde pasó.
   */
  describe('capitalización del nombre y el apellido', () => {
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
    ])(
      'normaliza %s',
      (_caso, firstName, lastName, expectedFirst, expectedLast) => {
        expect(parse({ firstName, lastName })).toMatchObject({
          firstName: expectedFirst,
          lastName: expectedLast,
        });
      },
    );
  });

  /**
   * Un campo vacío sigue significando "no lo cambies": la normalización no puede convertirlo en
   * una cadena que sobrescriba el nombre guardado.
   */
  describe('campos que se dejan sin tocar', () => {
    it.each(['', '   '])('un nombre de %p se omite del envío', (firstName) => {
      expect(parse({ firstName }).firstName).toBeUndefined();
    });

    it('dejar el campo vacío no sobrescribe el nombre guardado', () => {
      expect(parse({ lastName: 'Pérez' }).firstName).toBeUndefined();
    });
  });

  /** El resto de los campos conserva su tratamiento. */
  it('no capitaliza el CURP ni el RFC', () => {
    expect(
      parse({
        firstName: 'ana',
        nationalId: 'PELJ850101HDFRNN08',
        rfc: 'PELJ850101ABC',
      }),
    ).toMatchObject({
      nationalId: 'PELJ850101HDFRNN08',
      rfc: 'PELJ850101ABC',
    });
  });

  it('el correo y la contraseña siguen siendo obligatorios', () => {
    expect(
      editPreRegistrationSchema.safeParse({ ...validData, password: '' })
        .success,
    ).toBe(false);
  });
});
