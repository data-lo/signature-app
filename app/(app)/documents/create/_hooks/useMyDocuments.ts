'use client';

import { useQuery } from '@tanstack/react-query';
import { getMyDocumentsRequest } from '../_requests';

export function useMyDocuments(email: string | undefined, page: number) {
  return useQuery({
    queryKey: ['myDocuments', email, page],
    queryFn: () => getMyDocumentsRequest(email as string, page),
    enabled: Boolean(email),
  });
}
