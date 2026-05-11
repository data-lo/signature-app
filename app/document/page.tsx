import { redirect } from 'next/navigation';
import { validateAccess } from '../actions';
import DocumentViewer from './DocumentViewer';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DocumentPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const apiKey = params.apiKey as string;
  const userId = params.userId as string;
  const documentId = params.documentId as string;

  if (!apiKey || !userId || !documentId) {
    redirect('/error?code=400&message=Par%C3%A1metros+requeridos+faltantes');
  }

  const validation = await validateAccess({ apiKey, userId, documentId });

  if (!validation.valid) {
    redirect(`/error?code=${validation.statusCode || 500}&message=${encodeURIComponent(validation.error || 'Access denied')}`);
  }

  return <DocumentViewer documentUrl={validation.documentUrl!} documentId={documentId} userId={userId} apiKey={apiKey} />;
}