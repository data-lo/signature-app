'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import apiClient from '@/lib/axios';
import { getAuthToken } from '@/lib/cookies';
import {
  setPendingSignatureContext,
  clearPendingSignatureContext,
} from '@/lib/pending-signature-context';
import {
  getPublicSigningMethodRequest,
  type PublicSigningType,
} from '@/app/(public)/public/documents/[id]/sign/_requests';
import { logSafeError } from '@/lib/observability/safe-log';

interface AccessDocumentViewProps {
  documentId: string | null;
  collaboratorId: string | null;
  email: string | null;
}

/**
 * Punto de entrada del enlace de correo de "Notificación por Email para Firma Simple y
 * Vinculación de Cuenta": guarda el contexto (documentId, collaboratorId, email) en
 * localStorage para que /login y /register lo lean sin arrastrarlo por la URL, y redirige según
 * si ya hay sesión activa (Caso A: vincula en segundo plano de inmediato y manda al documento) o
 * no (Caso C: a /login — desde ahí, "¿No tienes cuenta? Regístrate" lleva a /register, que
 * también lee el contexto guardado — Caso B, vincula en el login posterior).
 *
 * Bug corregido: antes, el Caso A solo redirigía a /documents/:id y dejaba que
 * `findDetailForUser` vinculara la cuenta como efecto secundario de esa misma lectura (GET) — es
 * decir, el documento quedaba asociado/listado por una simple vista, no por una acción explícita
 * de sesión. Ahora la vinculación se dispara aquí mismo, de forma explícita, antes de redirigir.
 *
 * Firma de invitado sin cuenta: si no hay sesión y el backend dice que la invitación se firma en la
 * pantalla pública (biometría o Firma Avanzada de un firmante sin cuenta), no se manda a /login
 * sino a `/public/documents/:id/sign`, la misma URL para cualquier tipo: esa pantalla monta el
 * flujo del tipo que exige el documento. Ante cualquier duda (error de red, respuesta negativa) se
 * cae al /login de siempre.
 */
export default function AccessDocumentView({
  documentId,
  collaboratorId,
  email,
}: AccessDocumentViewProps) {
  const router = useRouter();
  const isValidLink = Boolean(documentId && collaboratorId);

  useEffect(() => {
    if (!documentId || !collaboratorId) return;

    setPendingSignatureContext({
      documentId,
      collaboratorId,
      email: email ?? '',
    });

    let cancelled = false;

    if (!getAuthToken()) {
      (async () => {
        let signatureType: PublicSigningType | null = null;
        try {
          signatureType = await getPublicSigningMethodRequest(documentId, {
            collaboratorId,
            email: email ?? '',
          });
        } catch {
          signatureType = null;
        }
        if (cancelled) return;

        if (signatureType) {
          // El invitado no pasa por /login: el contexto de vinculación no le sirve.
          clearPendingSignatureContext();
          const query = new URLSearchParams({
            collabId: collaboratorId,
            email: email ?? '',
          });
          router.replace(
            `/public/documents/${documentId}/sign?${query.toString()}`,
          );
          return;
        }
        router.replace('/login');
      })();

      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        await apiClient.patch(`/api/v1/document/${documentId}/link-collaborator`);
      } catch (error) {
        logSafeError('[access-document] no se pudo vincular la cuenta al documento', error);
      } finally {
        if (!cancelled) {
          clearPendingSignatureContext();
          router.replace(`/dashboard/documents/${documentId}`);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [documentId, collaboratorId, email, router]);

  if (!isValidLink) {
    return (
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Enlace inválido</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Este enlace para firmar un documento no es válido. Verifica que
            copiaste la URL completa desde tu correo.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md w-full">
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">Redirigiendo...</p>
      </CardContent>
    </Card>
  );
}
