import { useQuery } from '@tanstack/react-query';
import { getAccountsCatalogRequest } from '@/lib/api/accounts';

export function useAccountsCatalog() {
  return useQuery({
    queryKey: ['accountsCatalog'],
    queryFn: getAccountsCatalogRequest,
  });
}
