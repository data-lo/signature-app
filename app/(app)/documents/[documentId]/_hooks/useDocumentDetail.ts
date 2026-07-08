'use client';

import { useQuery } from '@tanstack/react-query';
import { getDocumentDetailRequest } from '../_requests';

export function useDocumentDetail(documentId: string) {
  return useQuery({
    queryKey: ['documentDetail', documentId],
    queryFn: () => getDocumentDetailRequest(documentId),
  });
}
