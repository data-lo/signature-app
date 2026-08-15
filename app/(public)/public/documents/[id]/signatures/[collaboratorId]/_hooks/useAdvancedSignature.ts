'use client';

import { useQuery } from '@tanstack/react-query';
import { getAdvancedSignatureRequest } from '../_requests';

export function useAdvancedSignature(
  documentId: string,
  collaboratorId: string,
) {
  return useQuery({
    queryKey: ['advancedSignature', documentId, collaboratorId],
    queryFn: () => getAdvancedSignatureRequest(documentId, collaboratorId),
    retry: false,
  });
}
