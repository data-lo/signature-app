import { createOrganizationSchema } from './_schemas';

describe('createOrganizationSchema', () => {
  it('acepta datos válidos', () => {
    const result = createOrganizationSchema.safeParse({
      name: 'Acme',
      organizationName: 'Acme Corp S.A. de C.V.',
    });

    expect(result.success).toBe(true);
  });

  it('rechaza si falta el nombre de visualización', () => {
    const result = createOrganizationSchema.safeParse({
      name: '',
      organizationName: 'Acme Corp S.A. de C.V.',
    });

    expect(result.success).toBe(false);
  });

  it('rechaza si falta la razón social', () => {
    const result = createOrganizationSchema.safeParse({
      name: 'Acme',
      organizationName: '',
    });

    expect(result.success).toBe(false);
  });

  it('recorta espacios en blanco', () => {
    const result = createOrganizationSchema.safeParse({
      name: '  Acme  ',
      organizationName: '  Acme Corp S.A. de C.V.  ',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Acme');
      expect(result.data.organizationName).toBe('Acme Corp S.A. de C.V.');
    }
  });
});
