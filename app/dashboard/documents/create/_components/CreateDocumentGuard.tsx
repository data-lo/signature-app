'use client';

import { useOnboardingReady } from '@/lib/hooks/useOnboardingReady';
import OnboardingBanner from './OnboardingBanner';
import InviteMemberModal from './InviteMemberModal';
import CreateDocumentView from './CreateDocumentView';

/**
 * /dashboard/documents/create es ahora la ruta por defecto del dashboard (antes /dashboard/home
 * y /dashboard/documents/create coexistían como dos rutas separadas para la misma vista — ver
 * README, "Duplicidad de rutas en menú del dashboard"). Con onboarding incompleto ya no redirige
 * a /dashboard/home (esa ruta no existe más): en su lugar absorbe el mismo criterio de bloqueo
 * que tenía HomeContent — la sección se renderiza igual (visible, con opacidad reducida) junto
 * con el banner que explica qué falta, en vez de ocultarla o mandar a otra pantalla.
 */
export default function CreateDocumentGuard() {
  const { isLoading, isReady } = useOnboardingReady();

  if (isLoading) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <OnboardingBanner />
      <div
        inert={!isReady}
        aria-disabled={!isReady}
        className={
          !isReady ? 'pointer-events-none opacity-50 select-none' : undefined
        }
      >
        <div className="flex justify-end">
          <InviteMemberModal />
        </div>
        <CreateDocumentView
          trackDocumentsCount={isReady}
          showCreatedDocuments={false}
        />
      </div>
    </div>
  );
}
