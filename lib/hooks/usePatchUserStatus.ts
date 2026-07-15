import { useMutation } from '@tanstack/react-query';
import apiClient from '@/lib/axios';

async function patchUserStatusRequest(): Promise<void> {
  await apiClient.patch('/api/v1/users/me/status', { isConfigured: true });
}

export function usePatchUserStatus() {
  return useMutation({
    mutationFn: patchUserStatusRequest,
  });
}
