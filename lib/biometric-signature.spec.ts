import { BiometricSignatureStatus } from '@/lib/enums/document';
import {
  BIOMETRIC_POLL_INTERVAL_MS,
  biometricPollInterval,
  type BiometricSignatureSession,
} from './biometric-signature';

function session(
  overrides: Partial<BiometricSignatureSession> = {},
): BiometricSignatureSession {
  return {
    attemptId: 'attempt-1',
    status: BiometricSignatureStatus.Pending,
    url: 'https://verify.didit.me/session/abc',
    expiresAt: null,
    reused: false,
    signatureCompleted: false,
    documentCompleted: false,
    ...overrides,
  };
}

describe('biometricPollInterval', () => {
  it.each([
    BiometricSignatureStatus.Pending,
    BiometricSignatureStatus.InProgress,
  ])('sondea mientras la sesión está %s', (status) => {
    expect(biometricPollInterval(session({ status }))).toBe(
      BIOMETRIC_POLL_INTERVAL_MS,
    );
  });

  it('sigue sondeando con la biometría aprobada hasta que la firma queda registrada', () => {
    expect(
      biometricPollInterval(
        session({ status: BiometricSignatureStatus.Approved }),
      ),
    ).toBe(BIOMETRIC_POLL_INTERVAL_MS);
    expect(
      biometricPollInterval(
        session({
          status: BiometricSignatureStatus.Approved,
          signatureCompleted: true,
        }),
      ),
    ).toBe(false);
  });

  it.each([
    BiometricSignatureStatus.Declined,
    BiometricSignatureStatus.Expired,
    BiometricSignatureStatus.Failed,
  ])('no sondea en un desenlace (%s)', (status) => {
    expect(biometricPollInterval(session({ status }))).toBe(false);
  });

  it('no sondea sin intento', () => {
    expect(biometricPollInterval(null)).toBe(false);
  });
});
