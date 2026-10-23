import DocumentViewSection from './_components/DocumentViewSection';

interface DocumentSignPageProps {
  params: Promise<{ documentId: string }>;
}

export default async function DocumentSignPage({
  params,
}: DocumentSignPageProps) {
  const { documentId } = await params;
  return <DocumentViewSection documentId={documentId} />;
}
