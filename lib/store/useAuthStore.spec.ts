import { useAuthStore } from './useAuthStore';
import { derivePersonalConfigured, deriveSignatureConfigured } from './auth.slice';
import type { CurrentUser } from '@/lib/api/auth';
import type { AccountData } from '@/lib/api/accounts';

function buildProfile(overrides: Partial<CurrentUser> = {}): CurrentUser {
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

function buildAccount(overrides: Partial<AccountData> = {}): AccountData {
  return {
    id: 'account-1',
    name: 'Acme',
    type: 'ORGANIZATION',
    createdAt: '2026-01-01T00:00:00.000Z',
    organizationDetail: { name: 'Acme Corp S.A. de C.V.' },
    roleId: 'admin-role-1',
    isActive: true,
    ...overrides,
  };
}

const RESET_STATE = {
  authToken: null,
  user: null,
  consolidationInFlight: false,
  accountsList: [],
  activeAccount: null,
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

describe('deriveSignatureConfigured', () => {
  it('es false si signatureId es null', () => {
    expect(deriveSignatureConfigured(buildProfile({ signatureId: null }))).toBe(
      false,
    );
  });

  it('es true si signatureId está presente', () => {
    expect(
      deriveSignatureConfigured(buildProfile({ signatureId: 'sig-1' })),
    ).toBe(true);
  });
});

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState(RESET_STATE);
  });

  describe('setAuth', () => {
    it('guarda el token y mapea el perfil, calculando ambas sub-banderas', () => {
      const profile = buildProfile({
        phoneNumber: '5512345678',
        secondaryEmail: 'secundario@correo.com',
        signatureId: 'sig-1',
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
        isConfigured: false,
        personalConfigured: true,
        signatureConfigured: true,
      });
    });

    it('calcula personalConfigured/signatureConfigured en false cuando faltan datos', () => {
      useAuthStore.getState().setAuth('jwt-token', buildProfile());

      const { user } = useAuthStore.getState();
      expect(user?.personalConfigured).toBe(false);
      expect(user?.signatureConfigured).toBe(false);
    });
  });

  describe('updateOnboardingStatus', () => {
    beforeEach(() => {
      useAuthStore.getState().setAuth('jwt-token', buildProfile());
    });

    it('muta únicamente personalConfigured cuando step es "personal"', () => {
      useAuthStore.getState().updateOnboardingStatus('personal', true);

      expect(useAuthStore.getState().user?.personalConfigured).toBe(true);
      expect(useAuthStore.getState().user?.signatureConfigured).toBe(false);
    });

    it('muta únicamente signatureConfigured cuando step es "signature"', () => {
      useAuthStore.getState().updateOnboardingStatus('signature', true);

      expect(useAuthStore.getState().user?.signatureConfigured).toBe(true);
      expect(useAuthStore.getState().user?.personalConfigured).toBe(false);
    });
  });

  describe('setAccountsList / addAccount', () => {
    it('normaliza el catálogo crudo del backend al shape del store', () => {
      useAuthStore.getState().setAccountsList([
        buildAccount({ id: 'org-1', type: 'ORGANIZATION' }),
        buildAccount({
          id: 'personal-1',
          type: 'PERSONAL',
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
        .setAccountsList([buildAccount({ id: 'personal-1', type: 'PERSONAL' })]);

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

  describe('logout', () => {
    it('resetea token, user, accountsList y activeAccount', () => {
      useAuthStore.getState().setAuth('jwt-token', buildProfile());
      useAuthStore.getState().setAccountsList([buildAccount()]);
      useAuthStore.getState().setActiveAccount({
        id: 'account-1',
        accountType: 'ORGANIZATION',
        organizationId: 'account-1',
        roleId: null,
      });

      useAuthStore.getState().logout();

      expect(useAuthStore.getState()).toMatchObject(RESET_STATE);
    });
  });

  describe('markConsolidating / markConsolidated', () => {
    it('markConsolidated fija isConfigured=true y apaga consolidationInFlight', () => {
      useAuthStore.getState().setAuth('jwt-token', buildProfile());
      useAuthStore.getState().markConsolidating(true);

      useAuthStore.getState().markConsolidated();

      expect(useAuthStore.getState().user?.isConfigured).toBe(true);
      expect(useAuthStore.getState().consolidationInFlight).toBe(false);
    });
  });
});
