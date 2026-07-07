import { redirect } from 'next/navigation';
import { validateAccess } from '../_actions';
import DocumentViewer from '../_components/DocumentViewer';

interface PageProps {
  params: Promise<{ documentId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DocumentPage({ params, searchParams }: PageProps) {
  const { documentId } = await params;
  const query = await searchParams;
  const apiKey = query.apiKey as string;
  const signerId = query.signerId as string;

  if (!apiKey || !signerId || !documentId) {
    redirect('/error?code=400&message=Par%C3%A1metros+requeridos+faltantes');
  }

  const validation = await validateAccess({ apiKey, signerId, documentId });

  if (!validation.valid) {
    redirect(`/error?code=${validation.statusCode || 500}&message=${encodeURIComponent(validation.error || 'Access denied')}`);
  }

  return (
    <DocumentViewer
      documentUrl={validation.documentUrl!}
      documentId={documentId}
      signerId={signerId}
      apiKey={apiKey}
      documentStatus={validation.documentStatus ?? 'pending'}
    />
  );
}
