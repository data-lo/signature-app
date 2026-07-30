import SignDocumentView from './_components/SignDocumentView';

interface DocumentSignPageProps {
  params: Promise<{ documentId: string }>;
}

export default async function DocumentSignPage({
  params,
}: DocumentSignPageProps) {
  const { documentId } = await params;
  return <SignDocumentView documentId={documentId} />;
}
