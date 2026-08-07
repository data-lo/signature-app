import { advancedSignatureSchema, rejectDocumentSchema } from './_schemas';

describe('rejectDocumentSchema', () => {
  it('acepta un motivo de al menos 5 caracteres', () => {
    const result = rejectDocumentSchema.safeParse({
      reason: 'No corresponde',
    });

    expect(result.success).toBe(true);
  });

  it('rechaza un motivo demasiado corto', () => {
    const result = rejectDocumentSchema.safeParse({ reason: 'No' });

    expect(result.success).toBe(false);
  });

  it('recorta espacios en blanco antes de validar la longitud', () => {
    const result = rejectDocumentSchema.safeParse({ reason: '   No   ' });

    expect(result.success).toBe(false);
  });
});

describe('advancedSignatureSchema', () => {
  it('acepta una contraseña no vacía', () => {
    const result = advancedSignatureSchema.safeParse({
      password: 'MiContraseña123',
    });

    expect(result.success).toBe(true);
  });

  it('rechaza una contraseña vacía', () => {
    const result = advancedSignatureSchema.safeParse({ password: '' });

    expect(result.success).toBe(false);
  });
});
