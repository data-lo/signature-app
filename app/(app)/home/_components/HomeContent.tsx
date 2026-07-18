'use client';

import { useAuthStore } from '@/lib/store/useAuthStore';
import CreateDocumentView from '../../documents/create/_components/CreateDocumentView';
import InviteMemberModal from './InviteMemberModal';

/**
 * Bug corregido (ver README, Historia 2): el warning de onboarding era solo visual —
 * CreateDocumentView/InviteMemberModal se renderizaban siempre en home/page.tsx, sin importar
 * personalConfigured/signatureConfigured. El README pide bloquear la navegación operativa
 * mientras el onboarding esté incompleto, no solo mostrar un aviso.
 */
export default function HomeContent() {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return null;
  }

  const isReady =
    user.isConfigured ||
    (user.personalConfigured && user.signatureConfigured);

  if (!isReady) {
    return (
      <p className="text-sm text-muted-foreground">
        Completa tu configuración para acceder a esta sección.
      </p>
    );
  }

  return (
    <>
      <div className="flex justify-end">
        <InviteMemberModal />
      </div>
      <CreateDocumentView />
    </>
  );
}
