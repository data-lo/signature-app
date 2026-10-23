/**
 * La fecha de término del periodo, en el formato largo que ya usa la tarjeta.
 *
 * Vive aparte porque la misma fecha se dice en dos sitios que tienen que coincidir: el aviso de
 * "seguirá activa hasta el X" de la tarjeta y el del modal de confirmación. Formatearla en cada
 * uno abriría la puerta a que el modal prometiera un día y la tarjeta mostrara otro.
 *
 * Devuelve `null` —y no una cadena vacía ni un "Invalid Date"— cuando no hay fecha o no se puede
 * leer, para que quien la use tenga que decidir explícitamente qué decir sin ella. Un perfil
 * ACTIVE sin `current_period_end` es raro pero posible (una corrección manual, un webhook que no
 * llegó), y no es motivo para escribirle "Invalid Date" al usuario.
 */
export function formatPeriodEnd(
  value: string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString('es-MX', { dateStyle: 'long' });
}
