import { loginSchema } from './_schemas';

describe('loginSchema', () => {
  it('acepta un correo y contraseña válidos', () => {
    const result = loginSchema.safeParse({
      email: 'usuario@correo.com',
      password: 'secreto123',
    });

    expect(result.success).toBe(true);
  });

  it('rechaza un correo inválido', () => {
    const result = loginSchema.safeParse({
      email: 'no-es-un-correo',
      password: 'secreto123',
    });

    expect(result.success).toBe(false);
  });

  it('rechaza una contraseña vacía', () => {
    const result = loginSchema.safeParse({
      email: 'usuario@correo.com',
      password: '',
    });

    expect(result.success).toBe(false);
  });
});
