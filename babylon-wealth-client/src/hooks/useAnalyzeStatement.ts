import { useMutation } from '@tanstack/react-query';
import { analyzeStatement } from '../api/statements';

export function useAnalyzeStatement() {
  return useMutation({
    mutationFn: (files: File[]) => analyzeStatement(files),
  });
}
