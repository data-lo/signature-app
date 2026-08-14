import AdvancedSignatureView from './_components/AdvancedSignatureView';

interface AdvancedSignaturePageProps {
  params: Promise<{ id: string; collaboratorId: string }>;
}

export default async function AdvancedSignaturePage({
  params,
}: AdvancedSignaturePageProps) {
  const { id, collaboratorId } = await params;

  return (
    <AdvancedSignatureView documentId={id} collaboratorId={collaboratorId} />
  );
}
