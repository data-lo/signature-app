'use client';

import { useQuery } from '@tanstack/react-query';
import { getPublicDocumentRequest } from '../_requests';

export function usePublicDocument(documentId: string) {
  return useQuery({
    queryKey: ['publicDocument', documentId],
    queryFn: () => getPublicDocumentRequest(documentId),
    retry: false,
  });
}
