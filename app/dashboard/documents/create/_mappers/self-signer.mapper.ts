import type { CurrentUser } from '@/lib/api/auth';
import {
  findSelfSignerIndex,
  type CollaboratorFormValues,
  type SignerFormValues,
} from '../_schemas';

/**
 * "Incluirme como firmante": el usuario en sesión se convierte en un SIGNER autocompletado con
 * sus datos de perfil y 2FA activo. Firma con el tipo que se eligió para el documento, igual que
 * cualquier otro firmante — no lo declara acá.
 *
 * `isSelf: true` es lo que lo distingue de un firmante capturado a mano: sin esa marca no habría
 * forma de saber cuál de las tarjetas hay que quitar al desmarcar la opción.
 */
export function buildSelfSigner(currentUser: CurrentUser): SignerFormValues {
  return {
    collaboratorType: 'SIGNER',
    firstName: currentUser.firstName,
    lastName: currentUser.lastName,
    email: currentUser.email,
    requiresTwoFactorAuth: true,
    signatures: [],
    isSelf: true,
  };
}

/**
 * Qué hacer con la tarjeta del usuario en sesión para que la lista de participantes refleje el
 * estado del checkbox. Se resuelve como función pura —igual que `resolveSignatureDrop`— para que
 * las reglas se puedan probar sin montar el formulario, y para que el efecto que la consume
 * (`CollaboratorsFieldArray`) no tenga que decidir nada por su cuenta.
 *
 * Antes el firmante propio no existía en la lista: se agregaba recién al enviar, así que el
 * usuario marcaba la opción y no veía ningún cambio. Ahora la tarjeta entra y sale del arreglo
 * `collaborators`, que es lo que renderiza las tarjetas y lo que cuenta los firmantes.
 */
export type SelfSignerSync =
  | { action: 'none' }
  | { action: 'add'; signer: SignerFormValues }
  | { action: 'remove'; index: number };

interface ResolveSelfSignerSyncParams {
  includeMeAsSigner: boolean;
  /** `undefined` mientras el perfil no haya cargado: sin datos no se puede autocompletar nada. */
  currentUser: CurrentUser | undefined;
  collaborators: CollaboratorFormValues[];
}

export function resolveSelfSignerSync({
  includeMeAsSigner,
  currentUser,
  collaborators,
}: ResolveSelfSignerSyncParams): SelfSignerSync {
  const existingIndex = findSelfSignerIndex(collaborators);

  if (!includeMeAsSigner) {
    // Sin la opción marcada no debe quedar ninguna tarjeta propia. Se contempla que no haya
    // ninguna (el caso normal) para que el efecto pueda correr en cada render sin hacer nada.
    return existingIndex === -1
      ? { action: 'none' }
      : { action: 'remove', index: existingIndex };
  }

  // Ya está agregada: marcar la opción de nuevo (o cualquier re-render del efecto) no debe
  // producir una segunda tarjeta.
  if (existingIndex !== -1) return { action: 'none' };

  // Marcada pero sin perfil cargado todavía: no se agrega un firmante a medias. Cuando el perfil
  // llegue, el efecto vuelve a evaluar y la agrega.
  if (!currentUser) return { action: 'none' };

  return { action: 'add', signer: buildSelfSigner(currentUser) };
}
