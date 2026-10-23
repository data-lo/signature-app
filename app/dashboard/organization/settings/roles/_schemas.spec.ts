import type { RolePermission } from '@/lib/api/organization-roles';
import { saveOrganizationRoleSchema, staticPermissionKeysOf } from './_schemas';

function permission(key: string, isStaticCatalog: boolean): RolePermission {
  return {
    id: `permission-${key}`,
    key,
    resource: key.split('.')[0],
    action: key.split('.')[1],
    scope: 'ANY',
    description: key,
    isStaticCatalog,
  } as RolePermission;
}

describe('saveOrganizationRoleSchema', () => {
  it('acepta un nombre válido con permisos del catálogo estático', () => {
    const result = saveOrganizationRoleSchema.safeParse({
      name: 'Aprobador',
      permissionKeys: ['DOCUMENT.READ_ORGANIZATION', 'DOCUMENT.APPROVE'],
    });

    expect(result.success).toBe(true);
  });

  /**
   * El catálogo del backend crece (BILLING, ROLE, MEMBER...), y el formulario tiene que poder
   * guardar esas claves el mismo día, sin que nadie las copie en el frontend. Cuáles son válidas
   * de verdad lo decide el backend contra su enum.
   */
  it('acepta claves del catálogo que el frontend no conoce de antemano', () => {
    const result = saveOrganizationRoleSchema.safeParse({
      name: 'Tesorería',
      permissionKeys: ['BILLING.READ', 'BILLING.MANAGE', 'ROLE.READ'],
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
});

describe('staticPermissionKeysOf', () => {
  it('se queda con las claves del catálogo estático', () => {
    const keys = staticPermissionKeysOf([
      permission('DOCUMENT.CREATE', true),
      permission('BILLING.MANAGE', true),
      permission('USER.DELETE', false),
    ]);

    expect(keys).toEqual(['DOCUMENT.CREATE', 'BILLING.MANAGE']);
  });

  /** La rejilla CRUD heredada del seed anterior no se ofrece al armar un rol. */
  it('descarta lo que no es del catálogo', () => {
    expect(staticPermissionKeysOf([permission('USER.READ', false)])).toEqual(
      [],
    );
  });
});
