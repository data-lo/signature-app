import Link from 'next/link';
import { FileSignature } from 'lucide-react';
import JoinView from './_components/JoinView';

interface JoinPageProps {
  searchParams: Promise<{ token?: string; orgId?: string }>;
}

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const { token, orgId } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="flex flex-col gap-6 max-w-md w-full">
        <Link href="/" className="flex items-center justify-center gap-2">
          <FileSignature className="size-6 text-emerald-500" />
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Signature
          </span>
        </Link>
        <JoinView token={token ?? null} orgId={orgId ?? null} />
      </div>
    </div>
  );
}
