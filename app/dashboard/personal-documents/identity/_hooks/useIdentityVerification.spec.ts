import { SigningCredentialStatus } from '@/lib/enums/identity';
import { identityPollInterval } from './useIdentityVerification';
import type { CurrentIdentityVerification } from '../_requests';

function given(status: SigningCredentialStatus): CurrentIdentityVerification {
  return {
    verification: null,
    signingCredentialStatus: status,
    signingCredentialConfigured: status === SigningCredentialStatus.Configured,
    identityVerifiedAt: null,
    signatureRegistered: false,
  };
}

describe('identityPollInterval', () => {
  it.each([
    SigningCredentialStatus.IdentityVerificationPending,
    SigningCredentialStatus.IdentityVerificationInProgress,
    SigningCredentialStatus.IdentityVerificationInReview,
  ])('sondea mientras el resultado depende del webhook (%s)', (status) => {
    expect(identityPollInterval(given(status))).toBe(5_000);
  });

  it.each([
    SigningCredentialStatus.IdentityVerificationRequired,
    SigningCredentialStatus.IdentityVerificationRetryRequired,
    SigningCredentialStatus.IdentityVerificationFailed,
    SigningCredentialStatus.IdentityVerificationMaxAttemptsExceeded,
    SigningCredentialStatus.SignaturePending,
    SigningCredentialStatus.Configured,
  ])('deja de sondear cuando el turno es del usuario (%s)', (status) => {
    expect(identityPollInterval(given(status))).toBe(false);
  });

  it('no sondea antes de la primera respuesta', () => {
    expect(identityPollInterval(undefined)).toBe(false);
  });
});
