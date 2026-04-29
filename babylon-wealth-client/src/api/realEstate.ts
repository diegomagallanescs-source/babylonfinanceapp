import apiClient from './client';
import type { PropertyAnalysisRequest, PropertyAnalysisResponseDto } from '../types/realEstate';

export async function analyzeProperty(
  req: PropertyAnalysisRequest,
): Promise<PropertyAnalysisResponseDto> {
  const { data } = await apiClient.post<PropertyAnalysisResponseDto>('/properties/analyze', req);
  return data;
}
