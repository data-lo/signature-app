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
import { checkGuestInvitationRequest } from '@/app/(public)/public/documents/[id]/biometric-signature/_requests';

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
 * Firma biométrica sin cuenta: si no hay sesión y la invitación es de un firmante biométrico sin
 * cuenta, no se manda a /login sino a la pantalla pública de firma del invitado, que valida la
 * posesión del correo con un código. Ante cualquier duda (error de red, respuesta negativa) se cae
 * al /login de siempre.
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
        let guestBiometric = false;
        try {
          guestBiometric = await checkGuestInvitationRequest(documentId, {
            collaboratorId,
            email: email ?? '',
          });
        } catch {
          guestBiometric = false;
        }
        if (cancelled) return;

        if (guestBiometric) {
          // El invitado no pasa por /login: el contexto de vinculación no le sirve.
          clearPendingSignatureContext();
          const query = new URLSearchParams({
            collabId: collaboratorId,
            email: email ?? '',
          });
          router.replace(
            `/public/documents/${documentId}/biometric-signature?${query.toString()}`,
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
        console.error(
          '[access-document] no se pudo vincular la cuenta al documento:',
          error,
        );
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
