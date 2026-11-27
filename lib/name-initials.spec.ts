import { nameInitials } from './name-initials';

describe('nameInitials', () => {
  it('toma la primera letra de las dos primeras palabras', () => {
    expect(nameInitials('Isaay Sosa')).toBe('IS');
    expect(nameInitials('Ana María Cepeda López')).toBe('AM');
  });

  it('ignora espacios de más y pasa a mayúscula', () => {
    expect(nameInitials('  ana   cepeda ')).toBe('AC');
  });

  it('con una sola palabra devuelve una inicial', () => {
    expect(nameInitials('Ángel')).toBe('Á');
  });

  it('un nombre vacío o en blanco no tiene iniciales', () => {
    expect(nameInitials('')).toBe('');
    expect(nameInitials('   ')).toBe('');
  });

  it('no parte un carácter fuera del plano básico', () => {
    expect(nameInitials('𝒜na Sosa')).toBe('𝒜S');
  });
});
