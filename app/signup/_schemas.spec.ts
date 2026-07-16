import { registerSchema } from './_schemas';

const validData = {
  firstName: 'Juan',
  lastName: 'Pérez',
  email: 'juan.perez@empresa.com',
  position: 'Gerente',
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
});
