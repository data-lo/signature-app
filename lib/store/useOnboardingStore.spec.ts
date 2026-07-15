import {
  derivePersonalConfigured,
  deriveSignatureConfigured,
  useOnboardingStore,
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

describe('useOnboardingStore', () => {
  beforeEach(() => {
    useOnboardingStore.setState({
      personalConfigured: false,
      signatureConfigured: false,
      isConfigured: false,
      consolidationInFlight: false,
    });
  });

  it('setPersonalConfigured muta únicamente personalConfigured', () => {
    useOnboardingStore.getState().setPersonalConfigured(true);

    expect(useOnboardingStore.getState().personalConfigured).toBe(true);
    expect(useOnboardingStore.getState().signatureConfigured).toBe(false);
  });

  it('setSignatureConfigured muta únicamente signatureConfigured', () => {
    useOnboardingStore.getState().setSignatureConfigured(true);

    expect(useOnboardingStore.getState().signatureConfigured).toBe(true);
    expect(useOnboardingStore.getState().personalConfigured).toBe(false);
  });

  it('dispara una notificación de suscriptor cuando ambas banderas quedan en true', () => {
    const listener = jest.fn();
    const unsubscribe = useOnboardingStore.subscribe(listener);

    useOnboardingStore.getState().setPersonalConfigured(true);
    useOnboardingStore.getState().setSignatureConfigured(true);

    const lastCallState = listener.mock.calls.at(-1)?.[0];
    expect(lastCallState.personalConfigured).toBe(true);
    expect(lastCallState.signatureConfigured).toBe(true);

    unsubscribe();
  });
});
