import Link from 'next/link';
import { FileSignature } from 'lucide-react';
import AccessDocumentView from './_components/AccessDocumentView';

interface AccessDocumentPageProps {
  searchParams: Promise<{
    docId?: string;
    collabId?: string;
    email?: string;
  }>;
}

export default async function AccessDocumentPage({
  searchParams,
}: AccessDocumentPageProps) {
  const { docId, collabId, email } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="flex flex-col gap-6 max-w-md w-full">
        <Link href="/" className="flex items-center justify-center gap-2">
          <FileSignature className="size-6 text-emerald-500" />
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Signature
          </span>
        </Link>
        <AccessDocumentView
          documentId={docId ?? null}
          collaboratorId={collabId ?? null}
          email={email ?? null}
        />
      </div>
    </div>
  );
}
