import { useQuery } from '@tanstack/react-query';
import { getOnboardingProfileRequest } from '@/lib/api/auth';

export function useOnboardingProfile() {
  return useQuery({
    queryKey: ['onboardingProfile'],
    queryFn: getOnboardingProfileRequest,
  });
}
