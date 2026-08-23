import { useQuery } from '@tanstack/react-query';
import { fetchProjection } from '../api/projections';

export function useProjection(id: string | undefined) {
  return useQuery({
    queryKey: ['projections', id],
    queryFn: () => fetchProjection(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}
