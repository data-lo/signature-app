import type { AuthorizationContext } from './authorization.types';
import {
  BILLING_PERMISSIONS_REQUIRED_TO_CONTRACT,
  verifyOrganizationOwnerActivation,
} from './organization-owner-activation';

const NEW_ORGANIZATION_ACCOUNT_ID = 'org-account-1';

/** Lo que el backend responde para una organización recién creada por su propietario. */
function ownerContext(
  overrides: Partial<AuthorizationContext> = {},
): AuthorizationContext {
  return {
    accountId: NEW_ORGANIZATION_ACCOUNT_ID,
    accountType: 'ORGANIZATION',
    organizationId: 'org-1',
    roleId: 'owner-role-1',
    roleName: 'OWNER',
    permissions: ['BILLING.READ', 'BILLING.MANAGE', 'MEMBER.READ'],
    ...overrides,
  };
}

describe('verifyOrganizationOwnerActivation', () => {
  it('acepta la organización recién creada cuyo creador quedó como propietario', () => {
    expect(
      verifyOrganizationOwnerActivation(
        NEW_ORGANIZATION_ACCOUNT_ID,
        ownerContext(),
      ),
    ).toEqual({ ok: true });
  });

  /**
   * El desajuste que provocaba el rebote a acceso no autorizado: el servidor se quedó en otra
   * cuenta, así que la cookie no apunta a la organización que se acaba de crear.
   */
  it('rechaza un contexto de una cuenta distinta de la recién creada', () => {
    const result = verifyOrganizationOwnerActivation(
      NEW_ORGANIZATION_ACCOUNT_ID,
      ownerContext({ accountId: 'personal-1' }),
    );

    expect(result).toMatchObject({ ok: false, problem: 'ACCOUNT_MISMATCH' });
  });

  it('rechaza una cuenta que no es de organización', () => {
    const result = verifyOrganizationOwnerActivation(
      NEW_ORGANIZATION_ACCOUNT_ID,
      ownerContext({ accountType: 'PERSONAL' }),
    );

    expect(result).toMatchObject({ ok: false, problem: 'NOT_AN_ORGANIZATION' });
  });

  it('rechaza a quien no quedó como propietario', () => {
    const result = verifyOrganizationOwnerActivation(
      NEW_ORGANIZATION_ACCOUNT_ID,
      ownerContext({ roleName: 'ADMIN' }),
    );

    expect(result).toMatchObject({ ok: false, problem: 'NOT_OWNER' });
  });

  it('rechaza una membresía todavía sin rol', () => {
    const result = verifyOrganizationOwnerActivation(
      NEW_ORGANIZATION_ACCOUNT_ID,
      ownerContext({ roleId: null, roleName: null }),
    );

    expect(result).toMatchObject({ ok: false, problem: 'NOT_OWNER' });
  });

  /**
   * Se exigen los dos permisos y no sólo `BILLING.READ`: a Planes se llega a CONTRATAR, y sin
   * `BILLING.MANAGE` el checkout responde 403. Ver el docblock de la constante.
   */
  it.each(BILLING_PERMISSIONS_REQUIRED_TO_CONTRACT)(
    'rechaza un rol al que le falta %s',
    (missing) => {
      const result = verifyOrganizationOwnerActivation(
        NEW_ORGANIZATION_ACCOUNT_ID,
        ownerContext({
          permissions: BILLING_PERMISSIONS_REQUIRED_TO_CONTRACT.filter(
            (permission) => permission !== missing,
          ),
        }),
      );

      expect(result).toMatchObject({
        ok: false,
        problem: 'MISSING_BILLING_PERMISSIONS',
      });
    },
  );

  /**
   * El orden importa: a quien cambió a la cuenta equivocada no le sirve enterarse de que le
   * faltan permisos de facturación, porque el problema es otro.
   */
  it('informa del problema más general cuando hay varios a la vez', () => {
    const result = verifyOrganizationOwnerActivation(
      NEW_ORGANIZATION_ACCOUNT_ID,
      ownerContext({
        accountId: 'personal-1',
        roleName: 'MEMBER',
        permissions: [],
      }),
    );

    expect(result).toMatchObject({ ok: false, problem: 'ACCOUNT_MISMATCH' });
  });

  it('acompaña cada rechazo de un mensaje que el usuario pueda leer', () => {
    const result = verifyOrganizationOwnerActivation(
      NEW_ORGANIZATION_ACCOUNT_ID,
      ownerContext({ roleName: 'MEMBER' }),
    );

    expect(result.ok).toBe(false);
    expect(!result.ok && result.message).toMatch(/organización se creó/i);
  });
});
