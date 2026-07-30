'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboardingReady } from '@/lib/hooks/useOnboardingReady';
import CreateDocumentView from './CreateDocumentView';

/**
 * Bug corregido: /documents/create no tenía ningún guard a nivel de ruta — a diferencia de la
 * copia de CreateDocumentView embebida en la home (bloqueada ahí con `inert` + opacidad cuando
 * el onboarding está incompleto), un usuario podía llegar directo aquí escribiendo la URL y usar
 * el formulario completo sin ninguna restricción, saltándose ese bloqueo por completo.
 *
 * Mismo criterio que HomeContent (useOnboardingReady, un solo punto de verdad para "¿está
 * listo?") — pero aquí, al ser una ruta independiente en vez de una sección embebida, la
 * respuesta correcta es redirigir a /dashboard/home en vez de mostrar contenido deshabilitado:
 * /dashboard/home ya explica qué falta (OnboardingBanner) y muestra la misma sección, visible
 * mientras se completa.
 */
export default function CreateDocumentGuard() {
  const router = useRouter();
  const { isLoading, isReady } = useOnboardingReady();

  useEffect(() => {
    if (!isLoading && !isReady) {
      router.replace('/dashboard/home');
    }
  }, [isLoading, isReady, router]);

  if (isLoading || !isReady) {
    return null;
  }

  return <CreateDocumentView showCreatedDocuments={false} />;
}
