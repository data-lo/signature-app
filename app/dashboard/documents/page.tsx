import { redirect } from 'next/navigation';
import { ParticipantStatus } from '@/lib/enums/document';
import { DOCUMENTS_SECTIONS } from './_config/sections';

/**
 * Ruta anterior de "Por firmar"/"Completados", que se distinguían aquí por `?status=`. Ahora
 * cada sección tiene su propia ruta y "Documentos" es solo un agrupador sin página propia:
 * este entry point únicamente redirige los links/bookmarks viejos a su equivalente nuevo.
 */
export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  redirect(
    status === ParticipantStatus.Signed
      ? DOCUMENTS_SECTIONS.completed.href
      : DOCUMENTS_SECTIONS['to-sign'].href,
  );
}
