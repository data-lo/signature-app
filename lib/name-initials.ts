/**
 * Iniciales de un nombre, para dar una referencia visual rápida sin depender de una foto de perfil.
 *
 * Toma la primera letra de las dos primeras palabras, en mayúscula. Es un apoyo visual y nada
 * más: quien lo pinte debe ocultarlo a los lectores de pantalla (`aria-hidden`), porque el nombre
 * completo ya está al lado y leer "I S, Isaay Sosa" sólo repite información.
 *
 * Itera por puntos de código y no por unidades UTF-16, para que un nombre que empiece con un
 * carácter fuera del plano básico no quede partido en medio par sustituto.
 *
 * @param name - Nombre tal como se muestra (p. ej. "Isaay Sosa").
 * @returns Hasta dos iniciales en mayúscula; cadena vacía si el nombre está vacío o en blanco.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * nameInitials('Isaay Sosa'); // 'IS'
 * nameInitials('  ana   maría cepeda '); // 'AM'
 * nameInitials('Ángel'); // 'Á'
 * nameInitials('   '); // ''
 * ```
 */
export function nameInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => (Array.from(part)[0] ?? '').toLocaleUpperCase('es-MX'))
    .join('');
}
