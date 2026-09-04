import { useAuthStore } from './useAuthStore';
import {
  derivePersonalConfigured,
  isSigningCredentialConfigured,
} from './auth.slice';
import { SigningCredentialStatus } from '@/lib/enums/identity';
import type { CurrentUser } from '@/lib/api/auth';
import type { AccountData } from '@/lib/api/accounts';

function buildProfile(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: 'user-1',
    firstName: 'Juan',
    lastName: 'Pérez',
    email: 'juan@empresa.com',
    roles: ['signer'],
    nationalId: 'PELJ850101HDFRNN08',
    phoneNumber: null,
    secondaryEmail: null,
    rfc: null,
    signatureId: null,
    signingCredentialStatus: SigningCredentialStatus.IdentityVerificationRequired,
    ...overrides,
  };
}

function buildAccount(overrides: Partial<AccountData> = {}): AccountData {
  return {
    id: 'account-1',
    type: 'ORGANIZATION',
    createdAt: '2026-01-01T00:00:00.000Z',
    organizationId: 'org-1',
    organizationDetail: { name: 'Acme Corp S.A. de C.V.' },
    roleId: 'admin-role-1',
    isActive: true,
    ...overrides,
  };
}

const RESET_STATE = {
  authToken: null,
  user: null,
  accountsList: [],
  activeAccount: null,
  billingByAccountId: {},
};

describe('derivePersonalConfigured', () => {
  it('es false si el usuario es null', () => {
    expect(derivePersonalConfigured(null)).toBe(false);
  });

  it('es false si falta el teléfono o el correo secundario', () => {
    expect(
      derivePersonalConfigured(
        buildProfile({ phoneNumber: null, secondaryEmail: 'a@a.com' }),
      ),
    ).toBe(false);
    expect(
      derivePersonalConfigured(
        buildProfile({ phoneNumber: '5512345678', secondaryEmail: null }),
      ),
    ).toBe(false);
  });

  it('es true si ambos campos están presentes', () => {
    expect(
      derivePersonalConfigured(
        buildProfile({ phoneNumber: '5512345678', secondaryEmail: 'a@a.com' }),
      ),
    ).toBe(true);
  });
});

/**
 * Sustituye a `deriveSignatureConfigured`, que respondía "¿tiene rúbrica subida?" mirando
 * `signatureId`. Esa pregunta no alcanzaba: no dice nada sobre si la identidad quedó validada,
 * así que daba `true` para usuarios a los que el backend igual les rechazaba la firma.
 */
describe('isSigningCredentialConfigured', () => {
  it('solo es true en CONFIGURED', () => {
    expect(
      isSigningCredentialConfigured(SigningCredentialStatus.Configured),
    ).toBe(true);
  });

  it.each([
    SigningCredentialStatus.IdentityVerificationRequired,
    SigningCredentialStatus.IdentityVerificationPending,
    SigningCredentialStatus.IdentityVerificationInProgress,
    SigningCredentialStatus.IdentityVerificationInReview,
    SigningCredentialStatus.IdentityVerificationRetryRequired,
    SigningCredentialStatus.IdentityVerificationFailed,
    SigningCredentialStatus.IdentityVerificationMaxAttemptsExceeded,
    SigningCredentialStatus.SignaturePending,
  ])('es false en %s', (status) => {
    expect(isSigningCredentialConfigured(status)).toBe(false);
  });

  /** Sin perfil hidratado no se afirma que falte nada: sólo que todavía no está configurada. */
  it('es false si todavia no se conoce el estado', () => {
    expect(isSigningCredentialConfigured(undefined)).toBe(false);
  });
});

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState(RESET_STATE);
  });

  describe('setAuth', () => {
    it('guarda el token y mapea el perfil, incluida la credencial de firma', () => {
      const profile = buildProfile({
        phoneNumber: '5512345678',
        secondaryEmail: 'secundario@correo.com',
        signatureId: 'sig-1',
        signingCredentialStatus: SigningCredentialStatus.Configured,
      });

      useAuthStore.getState().setAuth('jwt-token', profile);

      const { authToken, user } = useAuthStore.getState();
      expect(authToken).toBe('jwt-token');
      expect(user).toEqual({
        id: 'user-1',
        email: 'juan@empresa.com',
        identificationNumber: 'PELJ850101HDFRNN08',
        name: 'Juan',
        lastName: 'Pérez',
        signingCredentialStatus: SigningCredentialStatus.Configured,
        personalConfigured: true,
      });
    });

    /**
     * El estado de la credencial se copia tal cual: el store no lo deriva de `signatureId` ni de
     * ninguna otra cosa, porque quien lo calcula es el backend.
     */
    it('no deduce la credencial a partir de signatureId', () => {
      useAuthStore
        .getState()
        .setAuth('jwt-token', buildProfile({ signatureId: 'sig-1' }));

      expect(useAuthStore.getState().user?.signingCredentialStatus).toBe(
        SigningCredentialStatus.IdentityVerificationRequired,
      );
    });

    it('calcula personalConfigured en false cuando faltan datos de contacto', () => {
      useAuthStore.getState().setAuth('jwt-token', buildProfile());

      expect(useAuthStore.getState().user?.personalConfigured).toBe(false);
    });
  });

  describe('setPersonalConfigured', () => {
    beforeEach(() => {
      useAuthStore.getState().setAuth('jwt-token', buildProfile());
    });

    it('marca los datos de contacto sin tocar la credencial de firma', () => {
      useAuthStore.getState().setPersonalConfigured(true);

      expect(useAuthStore.getState().user?.personalConfigured).toBe(true);
      expect(useAuthStore.getState().user?.signingCredentialStatus).toBe(
        SigningCredentialStatus.IdentityVerificationRequired,
      );
    });
  });

  describe('setAccountsList / addAccount', () => {
    it('normaliza el catálogo crudo del backend al shape del store', () => {
      useAuthStore.getState().setAccountsList([
        buildAccount({ id: 'org-1', type: 'ORGANIZATION' }),
        buildAccount({
          id: 'personal-1',
          type: 'PERSONAL',
          organizationId: null,
          organizationDetail: null,
        }),
      ]);

      expect(useAuthStore.getState().accountsList).toEqual([
        {
          id: 'org-1',
          accountType: 'ORGANIZATION',
          organizationId: 'org-1',
          organizationName: 'Acme Corp S.A. de C.V.',
          roleId: 'admin-role-1',
          status: 'ACTIVE',
        },
        {
          id: 'personal-1',
          accountType: 'PERSONAL',
          organizationId: null,
          organizationName: null,
          roleId: 'admin-role-1',
          status: 'ACTIVE',
        },
      ]);
    });

    it('mapea roleId=null y status=INACTIVE cuando el backend los manda así', () => {
      useAuthStore.getState().setAccountsList([
        buildAccount({ id: 'org-1', type: 'ORGANIZATION', roleId: null }),
        buildAccount({ id: 'org-2', type: 'ORGANIZATION', isActive: false }),
      ]);

      const [withoutRole, revoked] = useAuthStore.getState().accountsList;
      expect(withoutRole.roleId).toBeNull();
      expect(withoutRole.status).toBe('ACTIVE');
      expect(revoked.roleId).toBe('admin-role-1');
      expect(revoked.status).toBe('INACTIVE');
    });

    it('addAccount agrega una cuenta nueva sin descartar las existentes', () => {
      useAuthStore
        .getState()
        .setAccountsList([
          buildAccount({ id: 'personal-1', type: 'PERSONAL', organizationId: null }),
        ]);

      useAuthStore.getState().addAccount(buildAccount({ id: 'org-2' }));

      expect(useAuthStore.getState().accountsList).toHaveLength(2);
      expect(useAuthStore.getState().accountsList[1].id).toBe('org-2');
    });
  });

  describe('setActiveAccount', () => {
    it('sobreescribe activeAccount quedándose solo con id/accountType/organizationId/roleId', () => {
      useAuthStore.getState().setActiveAccount({
        id: 'org-1',
        accountType: 'ORGANIZATION',
        organizationId: 'org-1',
        organizationName: 'Acme Corp S.A. de C.V.',
        roleId: null,
        status: 'ACTIVE',
      });

      expect(useAuthStore.getState().activeAccount).toEqual({
        id: 'org-1',
        accountType: 'ORGANIZATION',
        organizationId: 'org-1',
        roleId: null,
      });
    });

    it('persiste activeAccount en localStorage', () => {
      useAuthStore.getState().setActiveAccount({
        id: 'personal-1',
        accountType: 'PERSONAL',
        organizationId: null,
        roleId: null,
      });

      const persisted = JSON.parse(localStorage.getItem('auth-storage')!);
      expect(persisted.state.activeAccount).toEqual({
        id: 'personal-1',
        accountType: 'PERSONAL',
        organizationId: null,
        roleId: null,
      });
    });
  });

  describe('billingByAccountId', () => {
    /**
     * Un usuario tiene varias cuentas a la vez y cada una su propio plan: guardarlo indexado es
     * lo que permite cambiar de cuenta sin perder lo ya consultado de la anterior.
     */
    it('guarda el estado de cada cuenta por separado', () => {
      useAuthStore.getState().setBillingState('account-1', {
        billingProfileId: 'perfil-1',
        hasActiveSubscription: true,
        currentPlanType: 'plus',
      });
      useAuthStore.getState().setBillingState('account-org', {
        billingProfileId: 'perfil-org',
        hasActiveSubscription: false,
        currentPlanType: null,
      });

      expect(useAuthStore.getState().billingByAccountId).toEqual({
        'account-1': {
          billingProfileId: 'perfil-1',
          hasActiveSubscription: true,
          currentPlanType: 'plus',
        },
        'account-org': {
          billingProfileId: 'perfil-org',
          hasActiveSubscription: false,
          currentPlanType: null,
        },
      });
    });

    it('sobrescribe la entrada de una cuenta sin tocar las demás', () => {
      useAuthStore.getState().setBillingState('account-1', {
        billingProfileId: 'perfil-1',
        hasActiveSubscription: false,
        currentPlanType: null,
      });
      useAuthStore.getState().setBillingState('account-org', {
        billingProfileId: 'perfil-org',
        hasActiveSubscription: true,
        currentPlanType: 'premium',
      });

      // El webhook activó el perfil personal: sólo cambia esa entrada.
      useAuthStore.getState().setBillingState('account-1', {
        billingProfileId: 'perfil-1',
        hasActiveSubscription: true,
        currentPlanType: 'basic',
      });

      expect(useAuthStore.getState().billingByAccountId['account-1']).toEqual({
        billingProfileId: 'perfil-1',
        hasActiveSubscription: true,
        currentPlanType: 'basic',
      });
      expect(
        useAuthStore.getState().billingByAccountId['account-org'],
      ).toEqual({
        billingProfileId: 'perfil-org',
        hasActiveSubscription: true,
        currentPlanType: 'premium',
      });
    });
  });

  describe('logout', () => {
    it('resetea token, user, accountsList, activeAccount y el estado de facturación', () => {
      useAuthStore.getState().setAuth('jwt-token', buildProfile());
      useAuthStore.getState().setAccountsList([buildAccount()]);
      useAuthStore.getState().setActiveAccount({
        id: 'account-1',
        accountType: 'ORGANIZATION',
        organizationId: 'account-1',
        roleId: null,
      });
      useAuthStore.getState().setBillingState('account-1', {
        billingProfileId: 'perfil-1',
        hasActiveSubscription: true,
        currentPlanType: 'plus',
      });

      useAuthStore.getState().logout();

      expect(useAuthStore.getState()).toMatchObject(RESET_STATE);
    });
  });

});
