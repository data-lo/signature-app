'use client';

import { useMutation } from '@tanstack/react-query';
import {
  updatePreRegistrationRequest,
  type UpdatePreRegistrationValues,
} from '../../_requests';

/**
 * Corrección de los datos de un pre-registro todavía sin verificar.
 *
 * A diferencia del resto de las mutaciones del proyecto, esta NO lleva `onError`: el error no se
 * anuncia con un toast ni se guarda en un estado aparte, sino que se traduce a un error del campo
 * `email` dentro del `onSubmit` del formulario (ver `EditPreRegistrationForm`). El motivo es que
 * prácticamente todos los fallos de este endpoint son sobre ese campo —el correo nuevo ya está
 * tomado, o está mal escrito—, así que el mensaje pertenece junto al input que hay que corregir y
 * no en un aviso suelto al pie del formulario.
 *
 * Lo que sí aporta TanStack acá es `isPending`: el estado de "guardando" deja de mantenerse a mano
 * y no puede quedar desincronizado del resultado real de la petición.
 */
export function useUpdatePreRegistration() {
  return useMutation({
    // La lambda no es decorativa: react-query v5 invoca `mutationFn(variables, context)`, y pasar
    // la función de red directamente le entregaría ese segundo argumento —{ client, meta,
    // mutationKey, signal }— como si fuera parte de la petición. Acá no rompe nada porque
    // `updatePreRegistrationRequest` recibe un solo parámetro, pero deja que un detalle interno de
    // react-query se filtre hasta la capa de red; envolverla fija el contrato en un solo payload.
    mutationFn: (values: UpdatePreRegistrationValues) =>
      updatePreRegistrationRequest(values),
  });
}
