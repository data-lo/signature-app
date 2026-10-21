import {
  directoryContactFormValuesOf,
  directoryContactSchema,
  EMPTY_DIRECTORY_CONTACT_FORM,
  MAX_DIRECTORY_CONTACT_NAME_LENGTH,
} from './_schemas';

/** Campos con error de una validación, ordenados para comparar sin depender del orden de Zod. */
function invalidFields(values: Record<string, unknown>) {
  const result = directoryContactSchema.safeParse(values);
  if (result.success) return [];

  return [...new Set(result.error.issues.map((issue) => issue.path[0]))].sort();
}

describe('directoryContactSchema', () => {
  it('acepta un contacto completo y recorta los espacios', () => {
    const result = directoryContactSchema.parse({
      firstName: '  Ana ',
      lastName: ' García ',
      email: ' ana@example.com ',
    });

    expect(result).toEqual({
      firstName: 'Ana',
      lastName: 'García',
      email: 'ana@example.com',
    });
  });

  it('exige nombre, apellido y correo', () => {
    expect(invalidFields(EMPTY_DIRECTORY_CONTACT_FORM)).toEqual([
      'email',
      'firstName',
      'lastName',
    ]);
  });

  it('no da por capturado un campo con sólo espacios', () => {
    expect(
      invalidFields({ firstName: '   ', lastName: 'García', email: 'a@b.mx' }),
    ).toEqual(['firstName']);
  });

  it('rechaza un correo inválido', () => {
    expect(
      invalidFields({ firstName: 'Ana', lastName: 'García', email: 'ana@' }),
    ).toEqual(['email']);
  });

  it('respeta el tope de longitud del backend', () => {
    expect(
      invalidFields({
        firstName: 'a'.repeat(MAX_DIRECTORY_CONTACT_NAME_LENGTH + 1),
        lastName: 'García',
        email: 'ana@example.com',
      }),
    ).toEqual(['firstName']);
  });
});

describe('directoryContactFormValuesOf', () => {
  it('abre vacío para un alta', () => {
    expect(directoryContactFormValuesOf(null)).toEqual(
      EMPTY_DIRECTORY_CONTACT_FORM,
    );
  });

  it('abre con los datos del contacto para editarlo', () => {
    expect(
      directoryContactFormValuesOf({
        id: 'contact-1',
        firstName: 'Ana',
        lastName: 'García',
        email: 'ana@example.com',
        createdAt: '2026-10-01T10:00:00.000Z',
      }),
    ).toEqual({
      firstName: 'Ana',
      lastName: 'García',
      email: 'ana@example.com',
    });
  });
});
