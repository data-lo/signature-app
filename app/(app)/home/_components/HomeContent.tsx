'use client';

import { useAuthStore } from '@/lib/store/useAuthStore';
import CreateDocumentView from '../../documents/create/_components/CreateDocumentView';
import InviteMemberModal from './InviteMemberModal';

/**
 * Bug corregido (ver README, Historia 2): el warning de onboarding era solo visual —
 * CreateDocumentView/InviteMemberModal se renderizaban siempre en home/page.tsx, sin importar
 * personalConfigured/signatureConfigured. El README pide bloquear la navegación operativa
 * mientras el onboarding esté incompleto, no solo mostrar un aviso.
 *
 * Ajuste posterior ("Bloquear y opacar sección de configuración de firma"): bloquear ya no
 * significa ocultar por completo — la sección se sigue renderizando (visible, con opacidad
 * reducida) para que el usuario entienda que existe y por qué está bloqueada, en vez de
 * desaparecer sin explicación. `inert` deshabilita clics y foco de teclado en todo el subárbol
 * (soporte nativo desde React 19) — más robusto que solo `pointer-events-none`, que no bloquea
 * la navegación por teclado.
 *
 * `inert` no impide que CreateDocumentView se monte ni haga fetch (a propósito: la sección debe
 * mostrar contenido real, no un placeholder vacío) — pero eso también publicaría el conteo de
 * documentos en DocumentsCountContext, hecho un badge clickeable en DashboardNavbar (fuera de
 * este wrapper, siempre interactivo) que dejaría al usuario navegar a /documents saltándose el
 * bloqueo visual de aquí. `trackDocumentsCount={isReady}` corta esa fuga puntual sin afectar la
 * consulta ni la tabla dentro de la vista.
 */
export default function HomeContent() {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return null;
  }

  const isReady =
    user.isConfigured ||
    (user.personalConfigured && user.signatureConfigured);

  return (
    <div
      inert={!isReady}
      aria-disabled={!isReady}
      className={!isReady ? 'pointer-events-none opacity-50 select-none' : undefined}
    >
      <div className="flex justify-end">
        <InviteMemberModal />
      </div>
      <CreateDocumentView trackDocumentsCount={isReady} />
    </div>
  );
}
