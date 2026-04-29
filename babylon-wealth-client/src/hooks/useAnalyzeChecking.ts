import { useMutation } from '@tanstack/react-query';
import { analyzeChecking } from '../api/statements';

export function useAnalyzeChecking() {
  return useMutation({
    mutationFn: (files: File[]) => analyzeChecking(files),
  });
}
