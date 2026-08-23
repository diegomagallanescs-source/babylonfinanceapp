import { useQuery } from '@tanstack/react-query';
import { fetchProjections } from '../api/projections';

export function useProjections() {
  return useQuery({
    queryKey: ['projections'],
    queryFn: fetchProjections,
    staleTime: 30_000,
  });
}
