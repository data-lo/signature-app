import PublicDocumentView from './_components/PublicDocumentView';

interface PublicDocumentPageProps {
  params: Promise<{ id: string }>;
}

export default async function PublicDocumentPage({
  params,
}: PublicDocumentPageProps) {
  const { id } = await params;
  return <PublicDocumentView documentId={id} />;
}
