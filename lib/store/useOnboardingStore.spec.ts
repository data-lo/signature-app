import {
  derivePersonalConfigured,
  deriveSignatureConfigured,
} from './useOnboardingStore';
import type { CurrentUser } from '@/lib/api/auth';

function buildUser(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: 'user-1',
    firstName: 'Juan',
    lastName: 'Pérez',
    email: 'juan@empresa.com',
    position: 'Gerente',
    roles: ['signer'],
    nationalId: 'PELJ850101HDFRNN08',
    phoneNumber: null,
    secondaryEmail: null,
    rfc: null,
    signatureId: null,
    isConfigured: false,
    ...overrides,
  };
}

describe('derivePersonalConfigured', () => {
  it('es false si el usuario es null', () => {
    expect(derivePersonalConfigured(null)).toBe(false);
  });

  it('es false si falta el teléfono', () => {
    const user = buildUser({ phoneNumber: null, secondaryEmail: 'a@a.com' });
    expect(derivePersonalConfigured(user)).toBe(false);
  });

  it('es false si falta el correo secundario', () => {
    const user = buildUser({ phoneNumber: '5512345678', secondaryEmail: null });
    expect(derivePersonalConfigured(user)).toBe(false);
  });

  it('es false si el teléfono es una cadena vacía', () => {
    const user = buildUser({ phoneNumber: '', secondaryEmail: 'a@a.com' });
    expect(derivePersonalConfigured(user)).toBe(false);
  });

  it('es true si teléfono y correo secundario están presentes', () => {
    const user = buildUser({
      phoneNumber: '5512345678',
      secondaryEmail: 'a@a.com',
    });
    expect(derivePersonalConfigured(user)).toBe(true);
  });
});

describe('deriveSignatureConfigured', () => {
  it('es false si el usuario es null', () => {
    expect(deriveSignatureConfigured(null)).toBe(false);
  });

  it('es false si signatureId es null', () => {
    expect(deriveSignatureConfigured(buildUser({ signatureId: null }))).toBe(
      false,
    );
  });

  it('es true si signatureId está presente, sin importar el INE', () => {
    expect(
      deriveSignatureConfigured(buildUser({ signatureId: 'sig-1' })),
    ).toBe(true);
  });
});
