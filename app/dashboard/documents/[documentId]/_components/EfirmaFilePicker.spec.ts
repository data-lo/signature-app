import { matchesExtension } from './EfirmaFilePicker';

describe('matchesExtension', () => {
  it('acepta cuando la extensión coincide exactamente', () => {
    expect(matchesExtension('key', 'key')).toBe(true);
    expect(matchesExtension('cer', 'cer')).toBe(true);
  });

  it('acepta sin importar mayúsculas/minúsculas', () => {
    expect(matchesExtension('KEY', 'key')).toBe(true);
    expect(matchesExtension('Cer', 'cer')).toBe(true);
  });

  it('rechaza una extensión distinta', () => {
    expect(matchesExtension('txt', 'key')).toBe(false);
    expect(matchesExtension('pdf', 'cer')).toBe(false);
  });

  it('rechaza una extensión vacía', () => {
    expect(matchesExtension('', 'key')).toBe(false);
  });
});
