import apiClient from './client';
import type { SpendingCategoryResponseDto, CreateSpendingCategoryRequest } from '../types/spending';

export async function fetchSpendingCategories(): Promise<SpendingCategoryResponseDto[]> {
  const { data } = await apiClient.get<SpendingCategoryResponseDto[]>('/spending-categories');
  return data;
}

export async function createSpendingCategory(
  request: CreateSpendingCategoryRequest,
): Promise<SpendingCategoryResponseDto> {
  const { data } = await apiClient.post<SpendingCategoryResponseDto>('/spending-categories', request);
  return data;
}
