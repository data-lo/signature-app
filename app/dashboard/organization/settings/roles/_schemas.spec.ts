import {
  saveOrganizationRoleSchema,
  isStaticPermissionKey,
  STATIC_PERMISSION_KEYS,
} from './_schemas';

describe('saveOrganizationRoleSchema', () => {
  it('acepta un nombre válido con permisos del catálogo estático', () => {
    const result = saveOrganizationRoleSchema.safeParse({
      name: 'Aprobador',
      permissionKeys: ['DOCUMENT.READ_ORGANIZATION', 'DOCUMENT.APPROVE'],
    });

    expect(result.success).toBe(true);
  });

  it('acepta un arreglo de permisos vacío', () => {
    const result = saveOrganizationRoleSchema.safeParse({
      name: 'Solo lectura',
      permissionKeys: [],
    });

    expect(result.success).toBe(true);
  });

  it('rechaza un nombre vacío', () => {
    const result = saveOrganizationRoleSchema.safeParse({
      name: '  ',
      permissionKeys: [],
    });

    expect(result.success).toBe(false);
  });

  it('rechaza una clave que no pertenece al catálogo estático', () => {
    const result = saveOrganizationRoleSchema.safeParse({
      name: 'Aprobador',
      permissionKeys: ['ORGANIZATION.UPDATE'],
    });

    expect(result.success).toBe(false);
  });
});

describe('isStaticPermissionKey', () => {
  it.each(STATIC_PERMISSION_KEYS)('reconoce %s como clave del catálogo', (key) => {
    expect(isStaticPermissionKey(key)).toBe(true);
  });

  it('rechaza una clave de la rejilla CRUD heredada', () => {
    expect(isStaticPermissionKey('ORGANIZATION.READ')).toBe(false);
  });
});
