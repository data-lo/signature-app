'use client';

import { Loader2 } from 'lucide-react';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import UserInfoCard from './UserInfoCard';

export default function PersonalDocumentsView() {
  const { data: user, isLoading, isError } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Cargando tu información...
      </div>
    );
  }

  if (isError || !user) {
    return (
      <p className="text-sm text-destructive">
        No se pudo cargar tu información. Intenta de nuevo más tarde.
      </p>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <UserInfoCard user={user} />
    </div>
  );
}
