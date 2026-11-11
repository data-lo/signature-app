import { buildBillingAccess } from '@/lib/api/billing.fixtures';
import {
  biometricAvailabilityLabel,
  shouldShowBiometricCredits,
} from './biometric-credits';

describe('biometric-credits', () => {
  describe('biometricAvailabilityLabel', () => {
    it.each([
      [0, 'Sin firmas biométricas disponibles'],
      [1, '1 firma biométrica'],
      [8, '8 firmas biométricas'],
    ])('%p → %p', (credits, label) => {
      expect(biometricAvailabilityLabel(credits)).toBe(label);
    });
  });

  describe('shouldShowBiometricCredits', () => {
    it('se muestra si el plan incluye la firma biométrica, aunque el saldo sea 0', () => {
      expect(
        shouldShowBiometricCredits(
          buildBillingAccess({ biometricCreditsAvailable: 0 }),
        ),
      ).toBe(true);
    });

    it('se muestra con saldo aunque el plan ya no la incluya', () => {
      expect(
        shouldShowBiometricCredits(
          buildBillingAccess({
            biometricCreditsAvailable: 3,
            actions: { graphSignatureBiometrics: false },
          }),
        ),
      ).toBe(true);
    });

    it('no se muestra sin la capacidad en el plan y sin saldo', () => {
      expect(
        shouldShowBiometricCredits(
          buildBillingAccess({
            biometricCreditsAvailable: 0,
            actions: { graphSignatureBiometrics: false },
          }),
        ),
      ).toBe(false);
    });

    it('no se muestra si el backend no informa el campo', () => {
      expect(
        shouldShowBiometricCredits(
          buildBillingAccess({ biometricCreditsAvailable: undefined }),
        ),
      ).toBe(false);
    });
  });
});
