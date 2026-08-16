import { buildSelfSigner, resolveSelfSignerSync } from './self-signer.mapper';
import {
  emptySigner,
  emptyViewer,
  type CollaboratorFormValues,
} from '../_schemas';
import type { CurrentUser } from '@/lib/api/auth';

const CURRENT_USER = {
  firstName: 'Creador',
  lastName: 'Uno',
  email: 'creador@correo.com',
  rfc: 'CRUN800101ABC',
} as CurrentUser;

function sync(
  includeMeAsSigner: boolean,
  collaborators: CollaboratorFormValues[],
) {
  return resolveSelfSignerSync({
    includeMeAsSigner,
    currentUser: CURRENT_USER,
    collaborators,
  });
}

describe('buildSelfSigner', () => {
  it('autocompleta al usuario en sesión como firmante, sin firmas colocadas ni rfc', () => {
    expect(buildSelfSigner(CURRENT_USER)).toEqual({
      collaboratorType: 'SIGNER',
      firstName: 'Creador',
      lastName: 'Uno',
      email: 'creador@correo.com',
      signatures: [],
      isSelf: true,
    });
  });
});

describe('resolveSelfSignerSync', () => {
  describe('al marcar la opción', () => {
    it('agrega la tarjeta del usuario en sesión', () => {
      const result = sync(true, []);

      expect(result).toEqual({
        action: 'add',
        signer: buildSelfSigner(CURRENT_USER),
      });
    });

    it('la agrega también cuando ya hay participantes capturados a mano', () => {
      const result = sync(true, [emptySigner(), emptyViewer()]);

      expect(result.action).toBe('add');
    });

    // Criterio de aceptación: "No deben generarse registros duplicados si la opción se marca más
    // de una vez". El efecto que consume esta decisión se reevalúa en cada cambio del arreglo, así
    // que sin esta guarda cada vuelta agregaría otra tarjeta.
    it('no la duplica si ya está agregada', () => {
      const result = sync(true, [buildSelfSigner(CURRENT_USER)]);

      expect(result).toEqual({ action: 'none' });
    });

    it('no la duplica aunque haya firmantes manuales con los mismos datos: distingue por la marca, no por el correo', () => {
      const impostor = { ...emptySigner(), ...CURRENT_USER, isSelf: false };

      const result = sync(true, [impostor as CollaboratorFormValues]);

      expect(result.action).toBe('add');
    });

    it('sin perfil cargado todavía, no agrega un firmante a medias', () => {
      const result = resolveSelfSignerSync({
        includeMeAsSigner: true,
        currentUser: undefined,
        collaborators: [],
      });

      expect(result).toEqual({ action: 'none' });
    });
  });

  describe('al desmarcar la opción', () => {
    it('quita la tarjeta del usuario en sesión', () => {
      const result = sync(false, [buildSelfSigner(CURRENT_USER)]);

      expect(result).toEqual({ action: 'remove', index: 0 });
    });

    it('devuelve su posición real, sin tocar a los participantes capturados a mano', () => {
      const result = sync(false, [
        emptySigner(),
        emptyViewer(),
        buildSelfSigner(CURRENT_USER),
      ]);

      expect(result).toEqual({ action: 'remove', index: 2 });
    });

    it('no hace nada si no está agregada (el caso normal en cada render)', () => {
      const result = sync(false, [emptySigner()]);

      expect(result).toEqual({ action: 'none' });
    });
  });
});
