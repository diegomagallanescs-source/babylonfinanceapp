import { useQuery } from '@tanstack/react-query';
import { fetchProperties } from '../api/ledger';

export function useProperties() {
  return useQuery({
    queryKey: ['properties'],
    queryFn: fetchProperties,
    staleTime: 30_000,
  });
}
