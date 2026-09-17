import {
  DEFAULT_MEMBER_ROLE_NAME,
  formatRoleName,
} from './format-role-name';

describe('formatRoleName', () => {
  /**
   * El identificador del rol es lo que compara el backend; la pantalla está en español y no debe
   * exponer esa nomenclatura.
   */
  it('traduce los roles de sistema', () => {
    expect(formatRoleName('OWNER')).toBe('PROPIETARIO');
    expect(formatRoleName('ADMIN')).toBe('ADMINISTRADOR');
    expect(formatRoleName(DEFAULT_MEMBER_ROLE_NAME)).toBe('MIEMBRO');
  });

  /** El nombre de un rol custom lo eligió quien lo creó: se muestra tal cual. */
  it('deja intacto el nombre de un rol de organización', () => {
    expect(formatRoleName('Aprobador')).toBe('Aprobador');
  });

  it('muestra una raya cuando la membresía no tiene rol', () => {
    expect(formatRoleName(undefined)).toBe('—');
    expect(formatRoleName(null)).toBe('—');
    expect(formatRoleName('')).toBe('—');
  });

  /** El rol predeterminado es el identificador real, no la etiqueta traducida. */
  it('expone MEMBER como rol predeterminado', () => {
    expect(DEFAULT_MEMBER_ROLE_NAME).toBe('MEMBER');
  });
});
