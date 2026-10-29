import AdvancedSignatureFlow from './AdvancedSignatureFlow';
import BiometricSignatureFlow from './BiometricSignatureFlow';
import SimpleSignatureFlow from './SimpleSignatureFlow';
import { resolveSignatureFlow, signatureFlows } from './registry';

jest.mock('./AdvancedSignatureFlow', () => ({
  __esModule: true,
  default: function AdvancedStub() {
    return null;
  },
}));
jest.mock('./BiometricSignatureFlow', () => ({
  __esModule: true,
  default: function BiometricStub() {
    return null;
  },
}));
jest.mock('./SimpleSignatureFlow', () => ({
  __esModule: true,
  default: function SimpleStub() {
    return null;
  },
}));

describe('resolveSignatureFlow', () => {
  it.each([
    ['SIMPLE', SimpleSignatureFlow],
    ['ADVANCED', AdvancedSignatureFlow],
    ['BIOMETRIC', BiometricSignatureFlow],
  ])('%s → su flujo registrado', (type, flow) => {
    expect(resolveSignatureFlow(type)).toBe(flow);
  });

  it('el registro tiene exactamente los tres tipos del ticket', () => {
    expect(Object.keys(signatureFlows).sort()).toEqual([
      'ADVANCED',
      'BIOMETRIC',
      'SIMPLE',
    ]);
  });

  it.each([
    ['un tipo no registrado', 'NOM151'],
    ['el nombre del backend para la avanzada', 'FIEL'],
    ['minúsculas', 'simple'],
    ['vacío', ''],
    ['null', null],
    ['undefined', undefined],
    ['una propiedad heredada del objeto', 'toString'],
    ['__proto__', '__proto__'],
  ])('%s → null, sin flujo por defecto', (_case, type) => {
    expect(resolveSignatureFlow(type)).toBeNull();
  });

  it('consulta el registro que se le pase', () => {
    const Custom = () => null;
    expect(resolveSignatureFlow('SIMPLE', { SIMPLE: Custom })).toBe(Custom);
    expect(resolveSignatureFlow('ADVANCED', { SIMPLE: Custom })).toBeNull();
  });
});
